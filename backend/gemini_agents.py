"""
Gemini LLM agents — Person B, hours 10–14.

Three logical agents (Agents 1+2 batched in one HTTP call for latency):
  • Narrative: headline + today / 7-day / 14-day summaries
  • Advisory: general_measures, species_tips, timing_advice (from advisory_kb.json)
  • Species explainer: for photo flow (generate_species_explanation)

Uses Generative Language API REST + JSON mode; retries on malformed JSON.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx

from config import GEMINI_API_KEY, GEMINI_GENERATE_CONTENT_URL

_GEMINI_URL = GEMINI_GENERATE_CONTENT_URL
_DATA_DIR = Path(__file__).parent / "data"
_MAX_JSON_RETRIES = 2

with open(_DATA_DIR / "advisory_kb.json") as _f:
    _ADVISORY_KB = json.load(_f)


def parse_gemini_json_text(text: str) -> dict[str, Any]:
    """Strip optional markdown fences and parse JSON (shared with photo_classifier)."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)


def _extract_text_from_gemini_body(body: dict[str, Any]) -> str:
    cands = body.get("candidates") or []
    if not cands:
        err = (body.get("error") or {}).get("message") or "empty candidates"
        raise ValueError(f"Gemini response: {err}")
    cand = cands[0]
    reason = (cand.get("finishReason") or "").upper()
    if reason in ("SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"):
        raise ValueError(f"Gemini finishReason={reason}")
    parts = cand.get("content", {}).get("parts") or []
    if not parts:
        raise ValueError("Gemini returned no content parts")
    return parts[0].get("text") or ""


async def _call_gemini(
    system_prompt: str,
    user_content: str,
    *,
    temperature: float = 0.3,
    max_json_retries: int = _MAX_JSON_RETRIES,
) -> dict[str, Any]:
    """
    Call Gemini with JSON response mode; retry the HTTP request if JSON parse fails
    (common when the model wraps output or truncates).
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY.strip() in ("", "your-key-here"):
        raise ValueError("GEMINI_API_KEY is not configured")

    payload = {
        "contents": [{"parts": [{"text": user_content}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature":      temperature,
        },
    }

    last_error: Exception | None = None
    for attempt in range(max_json_retries + 1):
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(f"{_GEMINI_URL}?key={GEMINI_API_KEY}", json=payload)
            resp.raise_for_status()
            body = resp.json()

        try:
            text = _extract_text_from_gemini_body(body)
            if not text.strip():
                raise ValueError("empty model text")
            return parse_gemini_json_text(text)
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            last_error = e
            if attempt >= max_json_retries:
                break
            continue

    assert last_error is not None
    raise last_error


async def generate_forecast_and_advisory(
    daily_forecasts: list[dict],
    lat: float,
    lng: float,
) -> dict[str, Any]:
    """
    Agents 1 + 2 in a single Gemini call (batched for speed).

    Returns:
        {
          "narrative": { headline, today_summary, seven_day, fourteen_day },
          "advisory":  { general_measures, species_tips, timing_advice }
        }
    """
    advisory_kb_text = json.dumps(_ADVISORY_KB, indent=2)

    system = f"""You are a professional pollen forecast writer and allergy advisor.
Given pollen forecast data, produce two JSON objects:

1. "narrative": a human-readable forecast with keys:
   - headline: one punchy sentence (max 12 words) describing today's situation
   - today_summary: 2-3 sentences about today's pollen levels and top species
   - seven_day: 2-3 sentences about the 7-day trend
   - fourteen_day: 1-2 sentences about 14-day outlook and any season shifts

2. "advisory": actionable prevention advice with keys:
   - general_measures: list of 3-5 strings from the approved measures below
   - species_tips: list of 1-3 strings specific to the top active species
   - timing_advice: one sentence about best/worst time to be outdoors today

Use ONLY the approved measures from this knowledge base:
{advisory_kb_text}

Return JSON with exactly two keys: "narrative" and "advisory".
Be specific — mention species names and severity levels by name."""

    user_data = json.dumps({
        "location": {"lat": lat, "lng": lng},
        "today":        daily_forecasts[0] if daily_forecasts else {},
        "seven_day":    daily_forecasts[:7],
        "fourteen_day": daily_forecasts,
    })

    return await _call_gemini(system, user_data, temperature=0.3)


async def generate_species_explanation(
    species_name: str,
    stage: str,
    pollen_releasing: bool,
    lat: float,
    lng: float,
) -> dict[str, Any]:
    """
    Agent 3 — species explainer for photo classifier results.

    Returns: { "explanation": str, "action": str }
    """
    system = """You are a plant allergy expert. Given a plant species and its phenology stage,
provide:
- "explanation": 3-4 sentences explaining the species, its allergenicity, and what this stage means
- "action": one clear sentence on what the user should do right now

Return JSON with exactly two keys: "explanation" and "action"."""

    user_data = json.dumps({
        "species_name":     species_name,
        "phenology_stage":  stage,
        "pollen_releasing": pollen_releasing,
        "location":         {"lat": lat, "lng": lng},
    })

    return await _call_gemini(system, user_data, temperature=0.25)
