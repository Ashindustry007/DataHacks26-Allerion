#!/usr/bin/env python3
"""
Person B — run automated checks for integrations & agents.

Sections:
  1. Pytest — iNat + Google Pollen unit tests (no network).
  2. Import smoke — gemini_agents, photo_classifier, advisory_kb load.
  3. verify_person_b_apis.py — Pollen + iNat + Gemini HTTP (needs keys & network).
  4. Optional live (--live): google_pollen_client.fetch_google_pollen, Gemini narrative,
     optional photo vision (--photo).

Usage (from datahacks_26/):
  python scripts/test_person_b.py
  python scripts/test_person_b.py --offline
  python scripts/test_person_b.py --live --photo

Requires: pip install -r backend/requirements.txt
"""
from __future__ import annotations

import argparse
import asyncio
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
SCRIPTS = ROOT / "scripts"
VERIFY_SCRIPT = SCRIPTS / "verify_person_b_apis.py"

# Tiny valid JPEG (1×1 px) for optional vision smoke — not a real plant; API should still respond.
_MINIMAL_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy"
    "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEB"
    "AxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAA"
    "AAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
)


def _banner(title: str) -> None:
    print(flush=True)
    print("=" * 60, flush=True)
    print(f"  {title}", flush=True)
    print("=" * 60, flush=True)


def _load_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "backend" / ".env")


def step_pytest(verbose: bool, extra: bool) -> int:
    _banner("1. Pytest (Person B unit tests)")
    sys.stdout.flush()
    tests = [
        "tests/test_inat_client.py",
        "tests/test_google_pollen_client.py",
        "tests/test_gemini_agents.py",
    ]
    if extra:
        tests = ["tests/"]
    cmd = [sys.executable, "-m", "pytest"] + tests + (["-v"] if verbose else ["-q"])
    print("Command:", " ".join(cmd), "(cwd=backend)", flush=True)
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    rc = subprocess.call(cmd, cwd=str(BACKEND), env=env)
    if rc == 0:
        print("\n[OK] Pytest passed.", flush=True)
    else:
        print("\n[FAIL] Pytest exited with code", rc, flush=True)
    return rc


def step_import_smoke() -> int:
    _banner("2. Import smoke (modules + advisory_kb.json)")
    code = f"""
import sys
sys.path.insert(0, r"{BACKEND}")
import gemini_agents  # noqa: F401 — loads advisory_kb.json
import photo_classifier  # noqa: F401
import inat_client  # noqa: F401
import google_pollen_client  # noqa: F401
_kb = getattr(gemini_agents, "_ADVISORY_KB", {{}})
print("advisory_kb top-level keys:", list(_kb.keys()))
print("All Person B backend imports succeeded.")
"""
    rc = subprocess.call([sys.executable, "-c", code], env={**os.environ, "PYTHONUNBUFFERED": "1"})
    if rc == 0:
        print("\n[OK] Imports succeeded.", flush=True)
    else:
        print("\n[FAIL] Import smoke failed.", flush=True)
    return rc


def step_verify_apis() -> int:
    _banner("3. verify_person_b_apis.py (external HTTP)")
    if not VERIFY_SCRIPT.is_file():
        print("[SKIP] verify_person_b_apis.py not found.")
        return 0
    print("Command: python scripts/verify_person_b_apis.py")
    rc = subprocess.call([sys.executable, str(VERIFY_SCRIPT)], cwd=str(ROOT))
    if rc == 0:
        print("\n[OK] All API connectivity checks passed.")
    else:
        print("\n[WARN/FAIL] API checks failed or keys missing — see messages above.")
    return rc


async def _live_google_pollen() -> None:
    sys.path.insert(0, str(BACKEND))
    from google_pollen_client import fetch_google_pollen

    lat, lng = 32.71, -117.16
    series = await fetch_google_pollen(lat, lng)
    assert len(series) == 14, "Expected 14 slots"
    non_null = sum(1 for x in series[:5] if x is not None)
    print(f"  fetch_google_pollen({lat}, {lng}): {non_null}/5 day slots with data (indices 0–4)")
    if series[0]:
        print(f"  Day 0 date: {series[0].get('date')!r}, types: {list((series[0].get('types') or {}).keys())}")
    print("  Indices 5–13:", "all None" if all(series[i] is None for i in range(5, 14)) else "unexpected")


async def _live_gemini_narrative() -> None:
    sys.path.insert(0, str(BACKEND))
    from gemini_agents import generate_forecast_and_advisory

    daily = [
        {
            "date": "2026-04-18",
            "day_offset": 0,
            "confidence_tier": "high",
            "composite_index": 2.5,
            "severity": "moderate",
            "top_species": [
                {
                    "species_id": 56928,
                    "name": "White oak",
                    "pollen_type": "tree",
                    "current_stage": "PEAK_BLOOM",
                    "pollen_prob": 0.8,
                    "pollen_index": 3.0,
                    "days_to_peak": 0,
                    "peak_date_est": None,
                    "confidence": 0.85,
                    "sources": ["base", "inat"],
                    "seasonal_shift_days": 0,
                    "inat_obs_count": 3,
                    "google_upi": 3,
                }
            ],
        }
    ]
    out = await generate_forecast_and_advisory(daily, 32.71, -117.16)
    nar = out.get("narrative", {})
    adv = out.get("advisory", {})
    print(f"  narrative keys: {list(nar.keys())}")
    print(f"  advisory general_measures (count): {len(adv.get('general_measures', []))}")


async def _live_photo() -> None:
    sys.path.insert(0, str(BACKEND))
    from photo_classifier import classify_photo

    out = await classify_photo(_MINIMAL_JPEG_B64, 32.71, -117.16)
    print(f"  species_name: {out.get('species_name')!r}, confidence: {out.get('confidence')}")


async def _live_inat_delta_light() -> None:
    """One bbox; may take ~45s+ due to rate limits — optional."""
    sys.path.insert(0, str(BACKEND))
    from inat_client import fetch_inat_delta

    bbox = {"swlat": 32.5, "swlng": -117.5, "nelat": 33.1, "nelng": -116.8}
    obs = await fetch_inat_delta(bbox, since_days=3)
    print(f"  fetch_inat_delta: {len(obs)} deduplicated observations (since_days=3)")


def step_live(photo: bool, inat: bool) -> int:
    _banner("4. Live async checks (real API keys + network)")
    _load_dotenv()

    async def _run():
        await _live_google_pollen()
        await _live_gemini_narrative()
        if photo:
            print("\n  Photo classifier (tiny JPEG — expect generic/unknown plant):")
            await _live_photo()
        if inat:
            print("\n  iNat full delta (slow, ~1 req/s):")
            await _live_inat_delta_light()

    try:
        asyncio.run(_run())
        print("\n[OK] Live checks finished without exception.")
        return 0
    except Exception as e:
        print(f"\n[FAIL] Live check error: {e}")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Person B integration tests.")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose pytest (-v)")
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Skip network: pytest + imports only",
    )
    parser.add_argument(
        "--all-tests",
        action="store_true",
        help="Run full backend/tests/ suite (includes fusion & phenology)",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="After unit tests, run fetch_google_pollen + Gemini narrative (needs keys)",
    )
    parser.add_argument(
        "--photo",
        action="store_true",
        help="With --live, also run classify_photo on a 1×1 JPEG",
    )
    parser.add_argument(
        "--inat-delta",
        action="store_true",
        help="With --live, also run full fetch_inat_delta (slow)",
    )
    args = parser.parse_args()

    _load_dotenv()
    os.chdir(ROOT)
    print("Person B test runner — working directory:", ROOT, flush=True)

    rc = step_pytest(args.verbose, args.all_tests)
    if rc != 0:
        return rc

    rc = step_import_smoke()
    if rc != 0:
        return rc

    if args.offline:
        _banner("Skipped: network checks (--offline)")
        print("[OK] Offline run complete.")
        return 0

    rc = step_verify_apis()
    # verify failures are warnings if keys missing — don't fail whole script
    # unless user wants strict mode; we exit 0 if pytest+imports passed
    if args.live:
        rc_live = step_live(photo=args.photo, inat=args.inat_delta)
        if rc_live != 0:
            return rc_live

    return 0


if __name__ == "__main__":
    sys.exit(main())
