"""Photo species classifier using Gemini Vision — Person B implements this."""
import json

import httpx

from config import ALLERGEN_SPECIES, GEMINI_API_KEY

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)


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
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data":      image_base64,
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

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{_GEMINI_URL}?key={GEMINI_API_KEY}", json=payload)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]

    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)
