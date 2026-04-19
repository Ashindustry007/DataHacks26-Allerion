#!/usr/bin/env python3
"""
Person B — hour 0–2: verify integrations can reach external APIs.

Loads .env from the repo root (parent of scripts/) or backend/.env, then:
  1. Google Pollen API forecast:lookup (needs GOOGLE_POLLEN_API_KEY)
  2. iNaturalist observations (public; optional INAT_APP_ID for higher limits)
  3. Gemini generateContent JSON (needs GEMINI_API_KEY)

Usage (from repo root, e.g. datahacks_26/):
  python -m venv venv && source venv/bin/activate
  pip install -r backend/requirements.txt
  python scripts/verify_person_b_apis.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent


def _load_env() -> None:
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "backend" / ".env")


def _check_pollen(client: httpx.Client) -> tuple[bool, str]:
    key = os.getenv("GOOGLE_POLLEN_API_KEY", "").strip()
    if not key or key == "your-key-here":
        return False, "GOOGLE_POLLEN_API_KEY is missing or placeholder"

    url = "https://pollen.googleapis.com/v1/forecast:lookup"
    params = {
        "key": key,
        "location.latitude": 32.71,
        "location.longitude": -117.16,
        "days": 1,
        "plantsDescription": 0,
        "languageCode": "en",
    }
    r = client.get(url, params=params, timeout=30.0)
    if r.status_code != 200:
        return False, f"Pollen API HTTP {r.status_code}: {r.text[:200]}"
    data = r.json()
    if "dailyInfo" not in data and "error" in data:
        return False, f"Pollen API error payload: {data!r:.300}"
    return True, "Google Pollen API OK"


def _check_inat(client: httpx.Client) -> tuple[bool, str]:
    """iNat is public; optional app id only affects rate limits."""
    url = "https://api.inaturalist.org/v1/observations"
    params = {
        "taxon_id": 56928,
        "quality_grade": "research",
        "d1": "2026-04-01",
        "nelat": 33.1,
        "nelng": -116.8,
        "swlat": 32.5,
        "swlng": -117.5,
        "term_id": 12,
        "term_value_id": 13,
        "per_page": 5,
    }
    app_id = os.getenv("INAT_APP_ID", "").strip()
    if app_id and app_id != "your-inat-app-id":
        params["client_id"] = app_id

    r = client.get(url, params=params, timeout=30.0)
    if r.status_code != 200:
        return False, f"iNat HTTP {r.status_code}: {r.text[:200]}"
    data = r.json()
    n = len(data.get("results", []))
    return True, f"iNaturalist API OK ({n} sample results)"


def _gemini_error_detail(response: httpx.Response) -> str:
    """Extract Google error.message from JSON body for clearer 400/403 diagnostics."""
    try:
        data = response.json()
        err = data.get("error") or {}
        msg = err.get("message", "")
        status = err.get("status", "")
        if msg:
            return f"{status}: {msg}" if status else msg
    except (json.JSONDecodeError, TypeError):
        pass
    return response.text[:400]


def _check_gemini(client: httpx.Client) -> tuple[bool, str]:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key or key == "your-key-here":
        return False, "GEMINI_API_KEY is missing or placeholder"

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    # Match plan.md curl: plain text prompt — no responseMimeType (JSON mode can 400 on some keys/regions)
    payload = {
        "contents": [{"parts": [{"text": 'Say hello in JSON: {"message":"hello"}'}]}],
    }
    r = client.post(f"{url}?key={key}", json=payload, timeout=30.0)
    if r.status_code != 200:
        return False, f"Gemini HTTP {r.status_code}: {_gemini_error_detail(r)}"
    body = r.json()
    try:
        text = body["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as e:
        return False, f"Gemini response shape error: {e}; body={str(body)[:400]}"
    # Model may return JSON or prose; connectivity is enough for this smoke test
    if not (text or "").strip():
        return False, "Gemini returned empty text"
    return True, "Gemini API OK"


def main() -> int:
    _load_env()
    failures: list[str] = []

    with httpx.Client() as client:
        for name, fn in (
            ("Google Pollen", _check_pollen),
            ("iNaturalist", _check_inat),
            ("Gemini", _check_gemini),
        ):
            ok, msg = fn(client)
            status = "PASS" if ok else "FAIL"
            print(f"[{status}] {name}: {msg}")
            if not ok:
                failures.append(f"{name}: {msg}")

    if failures:
        print("\nSome checks failed. Fix env vars and network, then re-run.")
        return 1
    print("\nAll Person B API checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
