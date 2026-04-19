import json
from pathlib import Path

import h3

from config import H3_RESOLUTION
from phenology_engine import compute_day_forecast

_DATA_DIR = Path(__file__).parent / "data"


def generate_heatmap(center_lat: float, center_lng: float, radius_rings: int = 5) -> dict:
    """Generate GeoJSON FeatureCollection for H3 cells around a center point."""
    # Approximate H3 edge length in meters per resolution level
    H3_EDGE_METERS = {
        0: 1107712.591, 1: 418676.005, 2: 158244.655, 3: 59810.857,
        4: 22606.379, 5: 8544.408, 6: 3229.482, 7: 1220.629,
        8: 461.354, 9: 174.375, 10: 65.907, 11: 24.910,
        12: 9.415, 13: 3.559, 14: 1.348, 15: 0.509,
    }
    resolution_meters = round(H3_EDGE_METERS.get(H3_RESOLUTION, 0), 3)

    center_cell = h3.latlng_to_cell(center_lat, center_lng, H3_RESOLUTION)
    cells = h3.grid_disk(center_cell, radius_rings)

    features = []
    for cell in cells:
        lat, lng = h3.cell_to_latlng(cell)
        boundary = h3.cell_to_boundary(cell)
        # GeoJSON needs [lng, lat]; h3 returns (lat, lng) pairs
        coords = [[p[1], p[0]] for p in boundary]
        coords.append(coords[0])  # close the polygon

        forecast = compute_day_forecast(lat, lng, day_offset=0)
        top = forecast["top_species"]

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
            "properties": {
                "h3_cell":          cell,
                "lat":              round(lat, 6),
                "lng":              round(lng, 6),
                "composite_index":  forecast["composite_index"],
                "severity":         forecast["severity"],
                "top_species_name": top[0]["name"] if top else "None",
                "top_species_prob": top[0]["pollen_prob"] if top else 0.0,
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "h3_resolution": H3_RESOLUTION,
            "resolution_meters": resolution_meters,
            "total_cells": len(features),
            "center": {"lat": center_lat, "lng": center_lng},
        },
    }


def save_heatmap(center_lat: float, center_lng: float, filename: str, radius_rings: int = 5) -> None:
    """Pre-compute and persist heatmap GeoJSON to a file."""
    geojson = generate_heatmap(center_lat, center_lng, radius_rings)
    output_path = _DATA_DIR / filename
    with open(output_path, "w") as f:
        json.dump(geojson, f)
    print(f"Saved heatmap with {len(geojson['features'])} cells → {output_path}")


def load_heatmap(filename: str) -> dict | None:
    """Load a pre-computed heatmap from disk."""
    path = _DATA_DIR / filename
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)
