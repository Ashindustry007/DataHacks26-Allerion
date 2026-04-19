import json
import math
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

from config import ALLERGEN_SPECIES, H3_RESOLUTION

_DATA_DIR = Path(__file__).parent / "data"

with open(_DATA_DIR / "phenology_base.json") as f:
    PHENOLOGY_BASE: dict = json.load(f)

# Allergenicity weights scale the base pollen_prob into a 0-5 index
_ALLERGENICITY_SCALE = {1: 0.6, 2: 1.0, 3: 1.5, 4: 2.2, 5: 3.0}

_STAGE_BUDDING_WINDOW = 12    # days before onset = BUDDING
_STAGE_EARLY_FRACTION = 0.25  # fraction of duration = EARLY_BLOOM
_STAGE_PEAK_FRACTION  = 0.25  # fraction around peak = PEAK_BLOOM
_STAGE_LATE_FRACTION  = 0.35  # fraction after peak = LATE_BLOOM


def _get_lat_band(lat: float) -> str:
    band_lower = int(lat // 5) * 5
    band_upper = band_lower + 5
    return f"{band_lower}-{band_upper}"


def _get_base_phenology(species_id: int, lat: float) -> Optional[dict]:
    entry = PHENOLOGY_BASE.get(str(species_id))
    if not entry:
        return None
    band = _get_lat_band(lat)
    # Fall back to nearest band if exact not found
    if band not in entry["lat_bands"]:
        bands = sorted(entry["lat_bands"].keys(), key=lambda b: abs(float(b.split("-")[0]) - lat))
        band = bands[0]
    return entry["lat_bands"][band]


def _compute_stage(target_doy: int, onset_doy: int, peak_doy: int, duration: int) -> tuple[str, float]:
    """Return (stage, pollen_prob) for a given day of year."""
    end_doy = onset_doy + duration

    if target_doy < onset_doy - _STAGE_BUDDING_WINDOW:
        return "DORMANT", 0.0

    if target_doy < onset_doy:
        # Linear ramp from 0 → 0.15 during budding window
        progress = (target_doy - (onset_doy - _STAGE_BUDDING_WINDOW)) / _STAGE_BUDDING_WINDOW
        return "BUDDING", round(progress * 0.15, 3)

    early_end = onset_doy + duration * _STAGE_EARLY_FRACTION
    peak_start = peak_doy - duration * _STAGE_PEAK_FRACTION * 0.5
    peak_end   = peak_doy + duration * _STAGE_PEAK_FRACTION * 0.5
    late_end   = end_doy

    if target_doy < early_end:
        progress = (target_doy - onset_doy) / (early_end - onset_doy)
        return "EARLY_BLOOM", round(0.25 + progress * 0.35, 3)

    if target_doy <= peak_start:
        progress = (target_doy - early_end) / max(peak_start - early_end, 1)
        return "EARLY_BLOOM", round(0.50 + progress * 0.20, 3)

    if target_doy <= peak_end:
        # Bell curve around peak
        dist = abs(target_doy - peak_doy) / max(peak_end - peak_doy, 1)
        return "PEAK_BLOOM", round(1.0 - dist * 0.15, 3)

    if target_doy <= late_end:
        progress = (target_doy - peak_end) / max(late_end - peak_end, 1)
        return "LATE_BLOOM", round(0.80 - progress * 0.65, 3)

    # POST_BLOOM: decay for up to 10 days after season end
    days_past = target_doy - late_end
    if days_past <= 10:
        return "POST_BLOOM", round(max(0.0, 0.10 - days_past * 0.01), 3)

    return "POST_BLOOM", 0.0


def _compute_seasonal_shift(species_id: int, inat_obs: list[dict], lat: float) -> int:
    """Estimate how many days ahead/behind base phenology is this season from iNat obs."""
    base = _get_base_phenology(species_id, lat)
    if not base or not inat_obs:
        return 0

    flowering_doys = []
    for obs in inat_obs:
        if obs.get("taxon_id") != species_id:
            continue
        if obs.get("phenology_stage") not in ("EARLY_BLOOM", "PEAK_BLOOM", "LATE_BLOOM"):
            continue
        try:
            obs_date = date.fromisoformat(obs["observed_on"])
            flowering_doys.append(obs_date.timetuple().tm_yday)
        except (KeyError, ValueError):
            continue

    if not flowering_doys:
        return 0

    median_doy = sorted(flowering_doys)[len(flowering_doys) // 2]
    raw_shift = median_doy - base["onset_doy"]
    # Clamp to ±20 days to avoid data noise dominating
    return max(-20, min(20, raw_shift))


def _compute_pollen_index(pollen_prob: float, allergenicity: int, google_upi: Optional[int]) -> float:
    """Convert pollen_prob + allergenicity into 0-5 index, optionally calibrated by Google UPI."""
    base_index = pollen_prob * _ALLERGENICITY_SCALE.get(allergenicity, 1.5)
    if google_upi is not None:
        # Blend base index (60%) with Google UPI (40%) for days with Google data
        blended = base_index * 0.6 + google_upi * 0.4
        return round(min(5.0, blended), 2)
    return round(min(5.0, base_index), 2)


def _index_to_severity(composite_index: float) -> str:
    if composite_index < 1.5:
        return "low"
    if composite_index < 2.5:
        return "moderate"
    if composite_index < 3.5:
        return "high"
    return "very_high"


def _extract_google_upi(google_day: Optional[dict], google_code: str) -> Optional[int]:
    """Pull the per-species UPI out of a Google Pollen day dict."""
    if not google_day:
        return None
    plant_info = google_day.get("plants", {})
    entry = plant_info.get(google_code)
    if entry and entry.get("upi") is not None:
        return int(entry["upi"])
    # Fall back to pollen-type-level UPI
    type_map = {"TREE": "tree", "GRASS": "grass", "WEED": "weed"}
    species_meta = next((s for s in ALLERGEN_SPECIES if s["google_code"] == google_code), None)
    if species_meta:
        ptype = type_map.get(species_meta["pollen_type"].upper(), species_meta["pollen_type"])
        types_info = google_day.get("types", {})
        type_entry = types_info.get(ptype.upper()) or types_info.get(ptype)
        if type_entry and type_entry.get("upi") is not None:
            return int(type_entry["upi"])
    return None


def _inat_obs_count(species_id: int, inat_obs: list[dict]) -> int:
    return sum(1 for o in inat_obs if o.get("taxon_id") == species_id)


def compute_species_forecast(
    species: dict,
    lat: float,
    day_offset: int,
    today_doy: int,
    seasonal_shift: int,
    inat_obs: list[dict],
    google_day: Optional[dict],
) -> dict:
    base = _get_base_phenology(species["taxon_id"], lat)
    if not base:
        return None

    onset_doy  = base["onset_doy"] + seasonal_shift
    peak_doy   = base["peak_doy"]  + seasonal_shift
    duration   = base["duration"]

    target_doy = today_doy + day_offset
    stage, pollen_prob = _compute_stage(target_doy, onset_doy, peak_doy, duration)

    google_upi = _extract_google_upi(google_day, species["google_code"]) if day_offset <= 4 else None
    pollen_index = _compute_pollen_index(pollen_prob, species["allergenicity"], google_upi)

    days_to_peak = max(0, peak_doy - target_doy)
    peak_date = (date.today() + timedelta(days=days_to_peak)).isoformat() if days_to_peak > 0 else None

    sources = ["base"]
    obs_count = _inat_obs_count(species["taxon_id"], inat_obs)
    if obs_count > 0:
        sources.append("inat")
    if google_upi is not None:
        sources.append("google")

    confidence = 0.9 if day_offset <= 4 else max(0.4, 0.85 - (day_offset - 4) * 0.03)

    return {
        "species_id":           species["taxon_id"],
        "name":                 species["name"],
        "pollen_type":          species["pollen_type"],
        "current_stage":        stage,
        "pollen_prob":          pollen_prob,
        "pollen_index":         pollen_index,
        "days_to_peak":         days_to_peak,
        "peak_date_est":        peak_date,
        "confidence":           round(confidence, 2),
        "sources":              sources,
        "seasonal_shift_days":  seasonal_shift,
        "inat_obs_count":       obs_count,
        "google_upi":           google_upi,
    }


def compute_day_forecast(
    lat: float,
    lng: float,  # noqa: ARG001 — reserved for future spatial refinement
    day_offset: int,
    inat_obs: Optional[list[dict]] = None,
    google_data: Optional[list[Optional[dict]]] = None,
) -> dict:
    """Compute a single DailyForecast dict for one location + day_offset."""
    inat_obs = inat_obs or []
    google_data = google_data or []
    google_day = google_data[day_offset] if day_offset < len(google_data) else None

    today_doy = date.today().timetuple().tm_yday

    species_forecasts = []
    for species in ALLERGEN_SPECIES:
        shift = _compute_seasonal_shift(species["taxon_id"], inat_obs, lat)
        result = compute_species_forecast(
            species, lat, day_offset, today_doy, shift, inat_obs, google_day
        )
        if result:
            species_forecasts.append(result)

    # Sort by pollen_index descending; keep top 5
    species_forecasts.sort(key=lambda s: s["pollen_index"], reverse=True)
    top_species = species_forecasts[:5]

    # Composite index: weighted sum of top 3 species by allergenicity-scaled index
    if top_species:
        composite_index = sum(s["pollen_index"] for s in top_species[:3]) / 3
        composite_index = round(min(5.0, composite_index), 2)
    else:
        composite_index = 0.0

    target_date = (date.today() + timedelta(days=day_offset)).isoformat()

    return {
        "date":             target_date,
        "day_offset":       day_offset,
        "confidence_tier":  "high" if day_offset <= 4 else "estimated",
        "composite_index":  composite_index,
        "severity":         _index_to_severity(composite_index),
        "top_species":      top_species,
    }


def generate_14day_forecast(
    lat: float,
    lng: float,
    inat_obs: Optional[list[dict]] = None,
    google_data: Optional[list[Optional[dict]]] = None,
) -> list[dict]:
    """Generate 14 daily forecasts for a given location."""
    return [
        compute_day_forecast(lat, lng, offset, inat_obs, google_data)
        for offset in range(14)
    ]
