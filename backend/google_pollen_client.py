"""Google Pollen API client — Person B implements this."""
import httpx

from config import GOOGLE_POLLEN_API_KEY

_POLLEN_API_URL = "https://pollen.googleapis.com/v1/forecast:lookup"

# Maps Google plant codes to pollen types for type-level UPI fallback
_PLANT_TO_TYPE = {
    "OAK":        "TREE",
    "BIRCH":      "TREE",
    "JUNIPER":    "TREE",
    "ASH":        "TREE",
    "ELM":        "TREE",
    "COTTONWOOD": "TREE",
    "OLIVE":      "TREE",
    "ALDER":      "TREE",
    "RAGWEED":    "WEED",
    "MUGWORT":    "WEED",
    "GRAMINALES": "GRASS",
}


def _parse_daily_info(day_info: dict) -> dict:
    """Normalise one day of the Google Pollen API response into a flat dict."""
    types: dict[str, dict] = {}
    for t in day_info.get("pollenTypeInfo", []):
        code = t.get("code", "")
        upi  = t.get("indexInfo", {}).get("value")
        if code and upi is not None:
            types[code] = {"upi": int(upi)}

    plants: dict[str, dict] = {}
    for p in day_info.get("plantInfo", []):
        code = p.get("code", "")
        upi  = p.get("indexInfo", {}).get("value")
        if code and upi is not None:
            plants[code] = {"upi": int(upi)}

    return {
        "date":   day_info.get("date", {}).get("year", "") and
                  f"{day_info['date']['year']}-{day_info['date']['month']:02d}-{day_info['date']['day']:02d}",
        "types":  types,
        "plants": plants,
    }


async def fetch_google_pollen(lat: float, lng: float) -> list[dict | None]:
    """
    Returns a 14-element list. Indices 0-4 contain Google Pollen data dicts;
    indices 5-13 are None (Google only provides 5 days).
    """
    params = {
        "key":                GOOGLE_POLLEN_API_KEY,
        "location.latitude":  lat,
        "location.longitude": lng,
        "days":               5,
        "plantsDescription":  0,
        "languageCode":       "en",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(_POLLEN_API_URL, params=params)
        resp.raise_for_status()
        raw = resp.json()

    daily_info = raw.get("dailyInfo", [])
    parsed = [_parse_daily_info(d) for d in daily_info]
    padded = parsed + [None] * (14 - len(parsed))
    return padded[:14]
