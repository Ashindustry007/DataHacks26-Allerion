"""Photo species classifier using Gemini Vision — Person B (hours 14–16; shares JSON helpers with gemini_agents)."""
import json

import httpx

from config import ALLERGEN_SPECIES, GEMINI_API_KEY, GEMINI_GENERATE_CONTENT_URL
from gemini_agents import parse_gemini_json_text

_GEMINI_URL = GEMINI_GENERATE_CONTENT_URL
_VISION_JSON_RETRIES = 2


async def classify_photo(image_base64: str, lat: float, lng: float) -> dict:
    """
    Classify a user-submitted plant photo.

    Returns dict matching PhotoClassifyResponse (without local_forecast):
    {
        species_id, species_name, is_allergen, phenology_stage,
        pollen_releasing, confidence, reasoning
    }
    """
    species_list = ", ".join(
        f"{s['name']} (ID:{s['taxon_id']})" for s in ALLERGEN_SPECIES
    )

    system = f"""You are a plant identification and phenology expert.
Identify the plant in the image and classify its reproductive stage.

ALLERGEN SPECIES TO CHECK AGAINST:
{species_list}

Return JSON with exactly these keys:
{{
  "species_id": integer or null (use the ID from the list above, or null if not in list),
  "species_name": "common name of identified plant",
  "is_allergen": true or false,
  "phenology_stage": one of DORMANT | BUDDING | EARLY_BLOOM | PEAK_BLOOM | LATE_BLOOM | POST_BLOOM,
  "pollen_releasing": true or false,
  "confidence": float between 0.0 and 1.0,
  "reasoning": "one sentence explaining the identification and stage assessment"
}}"""

    if not GEMINI_API_KEY or GEMINI_API_KEY.strip() in ("", "your-key-here"):
        raise ValueError("GEMINI_API_KEY is not configured")

    # REST JSON must use camelCase for Part.inlineData (snake_case → 400 INVALID_ARGUMENT)
    payload = {
        "contents": [{
            "parts": [
                {
                    "text": (
                        f"Identify this plant and its phenology stage. "
                        f"Location: lat {lat}, lng {lng}"
                    )
                },
                {
                    "inlineData": {
                        "mimeType": "image/jpeg",
                        "data":     image_base64,
                    }
                },
            ]
        }],
        "systemInstruction": {"parts": [{"text": system}]},
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature":      0.2,
        },
    }

    last_err: Exception | None = None
    for _ in range(_VISION_JSON_RETRIES + 1):
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(f"{_GEMINI_URL}?key={GEMINI_API_KEY}", json=payload)
            resp.raise_for_status()
            body = resp.json()
            cands = body.get("candidates") or []
            if not cands:
                raise ValueError("Gemini vision: no candidates")
            text = cands[0]["content"]["parts"][0]["text"]
        try:
            return parse_gemini_json_text(text)
        except json.JSONDecodeError as e:
            last_err = e
            continue
    assert last_err is not None
    raise last_err
