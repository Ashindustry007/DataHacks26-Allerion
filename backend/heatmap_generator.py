import json
import math
from pathlib import Path

import h3

from config import H3_RESOLUTION
from phenology_engine import compute_day_forecast

_DATA_DIR = Path(__file__).parent / "data"

_HEATMAP_RESOLUTION = 9  # ~175m hexagons — dense local points


def generate_heatmap(center_lat: float, center_lng: float, radius_km: float = 1) -> dict:
    """Return a flat list of {lat, lng, weight} points within radius_km of center."""
    rings = max(1, int(radius_km / 0.26))
    center_cell = h3.latlng_to_cell(center_lat, center_lng, _HEATMAP_RESOLUTION)
    cells = h3.grid_disk(center_cell, rings)

    forecast = compute_day_forecast(center_lat, center_lng, day_offset=0)
    base_ci = forecast["composite_index"]
    top = forecast["top_species"]

    points = []
    for cell in cells:
        lat, lng = h3.cell_to_latlng(cell)
        dlat = (lat - center_lat) * 111.32
        dlng = (lng - center_lng) * 111.32 * math.cos(math.radians(center_lat))
        dist_km = math.sqrt(dlat * dlat + dlng * dlng)
        if dist_km > radius_km:
            continue
        # Gaussian-ish falloff for a circular blob
        norm_dist = dist_km / radius_km
        falloff = math.exp(-2.0 * norm_dist * norm_dist)
        weight = round(base_ci * falloff / 5.0, 4)
        points.append({
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "weight": max(0.01, weight),
        })

    return {
        "points": points,
        "forecast": {
            "composite_index": base_ci,
            "severity": forecast["severity"],
            "top_species_name": top[0]["name"] if top else "None",
            "top_species_prob": top[0]["pollen_prob"] if top else 0.0,
        },
        "metadata": {
            "h3_resolution": _HEATMAP_RESOLUTION,
            "radius_km": radius_km,
            "total_points": len(points),
            "center": {"lat": center_lat, "lng": center_lng},
        },
    }


def save_heatmap(center_lat: float, center_lng: float, filename: str, radius_km: float = 2) -> None:
    """Pre-compute and persist heatmap data to a file."""
    data = generate_heatmap(center_lat, center_lng, radius_km)
    output_path = _DATA_DIR / filename
    with open(output_path, "w") as f:
        json.dump(data, f)
    print(f"Saved heatmap with {len(data['points'])} points → {output_path}")


def load_heatmap(filename: str) -> dict | None:
    """Load a pre-computed heatmap from disk."""
    path = _DATA_DIR / filename
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)
