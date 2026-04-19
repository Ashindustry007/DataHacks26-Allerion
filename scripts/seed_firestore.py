"""
Seed Firestore (or local cache) with synthetic test observations for San Diego.
Run once before integration testing.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from datetime import date, timedelta

import h3

from config import ALLERGEN_SPECIES, H3_RESOLUTION
from firestore_client import save_observations

# San Diego bounding box sample points
_SAMPLE_LOCATIONS = [
    (32.71, -117.16),  # downtown
    (32.84, -117.27),  # La Jolla
    (32.65, -117.08),  # Chula Vista
    (32.75, -117.08),  # El Cajon
    (33.00, -117.08),  # Escondido
]

_BLOOMING_SPECIES = [56928, 56891, 48734]  # oaks + birch currently in bloom


def _make_obs(taxon_id: int, lat: float, lng: float, days_ago: int, stage: str) -> dict:
    obs_date = (date.today() - timedelta(days=days_ago)).isoformat()
    cell = h3.latlng_to_cell(lat, lng, H3_RESOLUTION)
    species = next(s for s in ALLERGEN_SPECIES if s["taxon_id"] == taxon_id)
    return {
        "id":              f"seed_{taxon_id}_{lat}_{lng}_{days_ago}",
        "taxon_id":        taxon_id,
        "species_name":    species["name"],
        "observed_on":     obs_date,
        "observed_at":     obs_date + "T10:00:00",
        "lat":             lat,
        "lng":             lng,
        "h3_cell":         cell,
        "phenology_stage": stage,
        "quality_grade":   "research",
    }


if __name__ == "__main__":
    observations = []
    stages = ["EARLY_BLOOM", "PEAK_BLOOM", "PEAK_BLOOM", "LATE_BLOOM", "EARLY_BLOOM"]

    for taxon_id in _BLOOMING_SPECIES:
        for (lat, lng), stage in zip(_SAMPLE_LOCATIONS, stages):
            for days_ago in (1, 3, 6):
                observations.append(_make_obs(taxon_id, lat, lng, days_ago, stage))

    save_observations(observations)
    print(f"Seeded {len(observations)} synthetic observations.")
