from datetime import datetime

import h3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import ALLERGEN_SPECIES, H3_RESOLUTION
from firestore_client import (
    get_cached_forecast,
    get_recent_observations,
    save_forecast,
    save_observations,
)
from gemini_agents import generate_forecast_and_advisory, generate_species_explanation
from heatmap_generator import generate_heatmap, load_heatmap, save_heatmap
from inat_client import _bbox_from_cells, fetch_inat_delta
from models import ForecastResponse, PhotoClassifyResponse
from phenology_engine import generate_14day_forecast
from photo_classifier import classify_photo

app = FastAPI(title="PollenCast API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# GET /api/forecast
# ---------------------------------------------------------------------------

@app.get("/api/forecast", response_model=ForecastResponse)
async def get_forecast(lat: float, lng: float):
    h3_cell = h3.latlng_to_cell(lat, lng, H3_RESOLUTION)

    try:
        cached = get_cached_forecast(h3_cell)
        if cached:
            return cached
    except Exception:
        pass

    neighbors = list(h3.grid_disk(h3_cell, 1))
    try:
        inat_obs = get_recent_observations(neighbors)
    except Exception:
        inat_obs = []

    # Attempt to fetch live Google Pollen data
    google_data = None
    try:
        from google_pollen_client import fetch_google_pollen
        google_data = await fetch_google_pollen(lat, lng)
    except Exception:
        pass  # degrade gracefully — base table still works

    daily = generate_14day_forecast(lat, lng, inat_obs, google_data)

    # Attempt Gemini narrative + advisory; fall back to static defaults
    narrative, advisory = _fallback_narrative_advisory(daily)
    try:
        result = await generate_forecast_and_advisory(daily, lat, lng)
        narrative = result.get("narrative", narrative)
        advisory  = result.get("advisory", advisory)
    except Exception:
        pass

    response = {
        "location":     {"lat": lat, "lng": lng, "h3_cell": h3_cell, "city": ""},
        "generated_at": datetime.utcnow().isoformat(),
        "daily":        daily,
        "narrative":    narrative,
        "advisory":     advisory,
    }

    try:
        save_forecast(h3_cell, response)
    except Exception:
        pass
    return response


def _fallback_narrative_advisory(daily: list[dict]) -> tuple[dict, dict]:
    """Static fallback for when Gemini is unavailable."""
    today = daily[0] if daily else {}
    severity = today.get("severity", "moderate")
    top = today.get("top_species", [])
    top_name = top[0]["name"] if top else "pollen"

    narratives = {
        "low":       f"Low pollen levels today — a good day to be outside.",
        "moderate":  f"{top_name} pollen is moderate — sensitive individuals should take precautions.",
        "high":      f"{top_name} pollen is high today. Limit outdoor exposure.",
        "very_high": f"Very high {top_name} pollen. Minimize outdoor activity.",
    }
    headline = narratives.get(severity, f"Pollen levels are {severity} today.")

    narrative = {
        "headline":       headline,
        "today_summary":  headline,
        "seven_day":      "Forecasts available for the next 14 days.",
        "fourteen_day":   "Extended forecast based on phenological baselines.",
    }
    advisory = {
        "general_measures": [
            "Keep windows closed during peak pollen hours (5–10 AM)",
            "Shower and change clothes after spending time outdoors",
            "Check pollen counts before planning outdoor activities",
        ],
        "species_tips":  [],
        "timing_advice": "Best outdoor time today is after 4 PM when pollen counts typically drop.",
    }
    return narrative, advisory


# ---------------------------------------------------------------------------
# POST /api/photo
# ---------------------------------------------------------------------------

class PhotoRequest(BaseModel):
    image_base64: str
    lat: float
    lng: float


@app.post("/api/photo", response_model=PhotoClassifyResponse)
async def classify_plant_photo(body: PhotoRequest):
    try:
        classification = await classify_photo(body.image_base64, body.lat, body.lng)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Vision API error: {exc}") from exc

    explanation, action = "Unable to generate explanation.", "Consult a local allergy specialist."
    try:
        result = await generate_species_explanation(
            classification.get("species_name", "Unknown"),
            classification.get("phenology_stage", "DORMANT"),
            classification.get("pollen_releasing", False),
            body.lat,
            body.lng,
        )
        explanation = result.get("explanation", explanation)
        action      = result.get("action", action)
    except Exception:
        pass

    # Fetch local forecast for the photo location
    local_forecast = None
    try:
        local_forecast = await get_forecast(body.lat, body.lng)
    except Exception:
        pass

    return {
        "species_id":      classification.get("species_id"),
        "species_name":    classification.get("species_name", "Unknown plant"),
        "is_allergen":     classification.get("is_allergen", False),
        "phenology_stage": classification.get("phenology_stage", "DORMANT"),
        "pollen_releasing": classification.get("pollen_releasing", False),
        "confidence":      classification.get("confidence", 0.0),
        "explanation":     explanation,
        "action":          action,
        "local_forecast":  local_forecast,
    }


# ---------------------------------------------------------------------------
# GET /api/heatmap
# ---------------------------------------------------------------------------

@app.get("/api/heatmap")
async def get_heatmap(lat: float, lng: float, radius_km: float = 30):
    # radius_km → approximate H3 ring count at resolution 4 (~22km per ring)
    radius_rings = max(1, int(radius_km / 22))

    # Try pre-computed file first (fast path for demo)
    cached_geojson = load_heatmap("heatmap_cache.json")
    if cached_geojson:
        return cached_geojson

    geojson = generate_heatmap(lat, lng, radius_rings)
    return geojson


# ---------------------------------------------------------------------------
# GET /api/species
# ---------------------------------------------------------------------------

@app.get("/api/species")
async def list_species():
    return [
        {
            "species_id":    s["taxon_id"],
            "name":          s["name"],
            "pollen_type":   s["pollen_type"],
            "allergenicity": s["allergenicity"],
        }
        for s in ALLERGEN_SPECIES
    ]


# ---------------------------------------------------------------------------
# POST /api/ingest/delta  (called by Cloud Scheduler)
# ---------------------------------------------------------------------------

class Region(BaseModel):
    name: str
    swlat: float
    swlng: float
    nelat: float
    nelng: float


class IngestRequest(BaseModel):
    regions: list[Region]


@app.post("/api/ingest/delta")
async def ingest_delta(body: IngestRequest):
    total = 0
    for region in body.regions:
        bbox = {
            "swlat": region.swlat,
            "swlng": region.swlng,
            "nelat": region.nelat,
            "nelng": region.nelng,
        }
        observations = await fetch_inat_delta(bbox, since_days=7)
        save_observations(observations)
        total += len(observations)

    return {"status": "ok", "observations_ingested": total}
