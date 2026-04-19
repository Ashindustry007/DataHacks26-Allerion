"""Gemini LLM agents — Person B implements this."""
import json
from pathlib import Path

import httpx

from config import GEMINI_API_KEY

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)
_DATA_DIR = Path(__file__).parent / "data"

with open(_DATA_DIR / "advisory_kb.json") as _f:
    _ADVISORY_KB = json.load(_f)


async def _call_gemini(system_prompt: str, user_content: str) -> dict:
    payload = {
        "contents": [{"parts": [{"text": user_content}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature":      0.3,
        },
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{_GEMINI_URL}?key={GEMINI_API_KEY}", json=payload)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]

    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)


async def generate_forecast_and_advisory(daily_forecasts: list[dict], lat: float, lng: float) -> dict:
    """
    Single Gemini call that returns both narrative and advisory dicts.
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
        "today":       daily_forecasts[0] if daily_forecasts else {},
        "seven_day":   daily_forecasts[:7],
        "fourteen_day": daily_forecasts,
    })

    return await _call_gemini(system, user_data)


async def generate_species_explanation(
    species_name: str,
    stage: str,
    pollen_releasing: bool,
    lat: float,
    lng: float,
) -> dict:
    """
    Generate a species-specific explanation and action for the photo classifier.
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

    return await _call_gemini(system, user_data)
