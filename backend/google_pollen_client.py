"""
Google Pollen API client (Person B, hours 6–10).

forecast:lookup returns up to 5 days of pollenTypeInfo (TREE/GRASS/WEED) and
plantInfo (OAK, BIRCH, …). We normalize that into day dicts and pad to 14 slots;
indices 5–13 are always None so fusion falls back to the phenology base table.

Mapping from Google plant codes → iNat taxon IDs lives in config.GOOGLE_TO_INAT_MAP;
use `inat_taxon_ids_for_google_plant` from this module in integrations/tests.
"""
from __future__ import annotations

from typing import Any, Optional

import httpx

from config import ALLERGEN_SPECIES, GOOGLE_POLLEN_API_KEY, GOOGLE_TO_INAT_MAP

_POLLEN_API_URL = "https://pollen.googleapis.com/v1/forecast:lookup"
_GOOGLE_FORECAST_DAYS = 5
_TOTAL_FORECAST_DAYS = 14


def extract_upi_for_google_code(google_day: Optional[dict], google_code: str) -> Optional[int]:
    """
    Resolve UPI (0–5) for one allergen species from a normalized Google day dict.

    Uses per-plant `plants[GOOGLE_CODE]` when present; otherwise falls back to
    pollen-type UPI in `types` (TREE / GRASS / WEED) for that species.
    """
    if not google_day:
        return None
    plant_info = google_day.get("plants") or {}
    entry = plant_info.get(google_code) or plant_info.get((google_code or "").strip().upper())
    if entry and entry.get("upi") is not None:
        return int(entry["upi"])
    type_map = {"TREE": "tree", "GRASS": "grass", "WEED": "weed"}
    species_meta = next((s for s in ALLERGEN_SPECIES if s["google_code"] == google_code), None)
    if species_meta:
        ptype = type_map.get(species_meta["pollen_type"].upper(), species_meta["pollen_type"])
        types_info = google_day.get("types") or {}
        type_entry = types_info.get(ptype.upper()) or types_info.get(ptype)
        if type_entry and type_entry.get("upi") is not None:
            return int(type_entry["upi"])
    return None


def inat_taxon_ids_for_google_plant(plant_code: str) -> list[int]:
    """Return iNat taxon IDs that correspond to a Google Pollen plant genus code."""
    return list(GOOGLE_TO_INAT_MAP.get(plant_code.upper(), []))


def _upi_from_block(block: dict[str, Any]) -> Optional[int]:
    """Extract UPI (0–5) from pollenTypeInfo or plantInfo element."""
    info = block.get("indexInfo") or {}
    val = info.get("value")
    if val is not None:
        try:
            return int(val)
        except (TypeError, ValueError):
            return None
    # Some responses nest index separately
    idx = info.get("index") if isinstance(info.get("index"), dict) else None
    if isinstance(idx, dict) and idx.get("value") is not None:
        try:
            return int(idx["value"])
        except (TypeError, ValueError):
            return None
    return None


def _code_from_block(block: dict[str, Any]) -> str:
    raw = block.get("code") or block.get("displayName") or ""
    return str(raw).strip().upper()


def _parse_daily_info(day_info: dict[str, Any]) -> dict[str, Any]:
    """Normalise one dailyInfo object into types/plants dicts keyed by UPPERCASE code."""
    types: dict[str, dict[str, int]] = {}
    for t in day_info.get("pollenTypeInfo") or []:
        code = _code_from_block(t)
        upi = _upi_from_block(t)
        if code and upi is not None:
            types[code] = {"upi": upi}

    plants: dict[str, dict[str, int]] = {}
    for p in day_info.get("plantInfo") or []:
        code = _code_from_block(p)
        upi = _upi_from_block(p)
        if code and upi is not None:
            plants[code] = {"upi": upi}

    d = day_info.get("date") or {}
    y, m, day = d.get("year"), d.get("month"), d.get("day")
    date_str = ""
    if y is not None and m is not None and day is not None:
        try:
            date_str = f"{int(y)}-{int(m):02d}-{int(day):02d}"
        except (TypeError, ValueError):
            date_str = ""

    return {
        "date":   date_str,
        "types":  types,
        "plants": plants,
    }


def build_fourteen_day_series(daily_info: list[dict[str, Any]]) -> list[Optional[dict]]:
    """
    Build a 14-element series from raw API `dailyInfo` (ordered oldest→newest or as returned).

    The first five slots correspond to Google’s forecast days (typically today..+4).
    Short responses are padded with None in positions 0–4; positions 5–13 are always None.
    """
    parsed: list[Optional[dict]] = [_parse_daily_info(d) for d in daily_info[:_GOOGLE_FORECAST_DAYS]]
    while len(parsed) < _GOOGLE_FORECAST_DAYS:
        parsed.append(None)
    # Days 6–14 (indices 5–13): no Google data
    parsed.extend([None] * (_TOTAL_FORECAST_DAYS - _GOOGLE_FORECAST_DAYS))
    return parsed[:_TOTAL_FORECAST_DAYS]


def parse_lookup_response_body(raw: dict[str, Any]) -> list[Optional[dict]]:
    """Parse a JSON object from forecast:lookup (no HTTP). Used by tests and tooling."""
    daily = raw.get("dailyInfo") or []
    return build_fourteen_day_series(daily)


async def fetch_google_pollen(lat: float, lng: float) -> list[Optional[dict]]:
    """
    Call Google Pollen API and return 14 elements: indices 0–4 may contain day dicts
    with `date`, `types`, `plants`; indices 5–13 are always None.

    If GOOGLE_POLLEN_API_KEY is unset, returns 14× None without calling the network.
    """
    if not GOOGLE_POLLEN_API_KEY or GOOGLE_POLLEN_API_KEY.strip() in (
        "",
        "your-key-here",
    ):
        return [None] * _TOTAL_FORECAST_DAYS

    params: dict[str, Any] = {
        "key":                 GOOGLE_POLLEN_API_KEY,
        "location.latitude":   lat,
        "location.longitude":  lng,
        "days":                _GOOGLE_FORECAST_DAYS,
        "plantsDescription":   0,
        "languageCode":        "en",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(_POLLEN_API_URL, params=params)
            resp.raise_for_status()
            raw = resp.json()
    except (httpx.HTTPError, httpx.TimeoutException, ValueError, TypeError, KeyError):
        # Quota, network, or malformed JSON — fusion can proceed on base + iNat only
        return [None] * _TOTAL_FORECAST_DAYS

    return parse_lookup_response_body(raw)


# Plan / docs refer to `fetch()` — alias for the same coroutine
fetch = fetch_google_pollen
