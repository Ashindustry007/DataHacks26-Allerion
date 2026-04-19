"""
One-time script to build phenology_base.json from a GBIF/iNat CSV export.

If the CSV is unavailable, the hardcoded table in backend/data/phenology_base.json
is used as-is (derived from USDA/NPN published data).

Expected CSV columns: taxon_id, observed_on, decimalLatitude, phenology_stage
"""
import csv
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

_BACKEND_DATA = Path(__file__).parent.parent / "backend" / "data"
_LAT_BANDS = ["25-30", "30-35", "35-40", "40-45", "45-50"]

PHENOLOGY_STAGES_BLOOMING = {"EARLY_BLOOM", "PEAK_BLOOM", "LATE_BLOOM", "Flowering"}


def _lat_band(lat: float) -> str:
    lower = int(lat // 5) * 5
    return f"{lower}-{lower + 5}"


def build_table(csv_path: str) -> dict:
    # species_id → band → list of (onset_doy, peak_doy) pairs
    records: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))

    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("phenology_stage") not in PHENOLOGY_STAGES_BLOOMING:
                continue
            try:
                taxon_id = str(int(row["taxon_id"]))
                lat = float(row["decimalLatitude"])
                from datetime import date
                obs_date = date.fromisoformat(row["observed_on"])
                doy = obs_date.timetuple().tm_yday
            except (ValueError, KeyError):
                continue

            band = _lat_band(lat)
            if band in _LAT_BANDS:
                records[taxon_id][band].append(doy)

    table: dict = {}
    for taxon_id, bands in records.items():
        lat_bands = {}
        for band, doys in bands.items():
            if len(doys) < 3:
                continue
            doys_sorted = sorted(doys)
            onset_doy = doys_sorted[int(len(doys_sorted) * 0.10)]
            peak_doy  = int(statistics.median(doys_sorted))
            end_doy   = doys_sorted[int(len(doys_sorted) * 0.90)]
            lat_bands[band] = {
                "onset_doy": onset_doy,
                "peak_doy":  peak_doy,
                "duration":  max(10, end_doy - onset_doy),
            }
        if lat_bands:
            table[taxon_id] = {"lat_bands": lat_bands}

    return table


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python build_phenology_table.py <gbif_observations.csv>")
        print("Skipping — hardcoded table in backend/data/phenology_base.json is already in place.")
        sys.exit(0)

    csv_path = sys.argv[1]
    print(f"Building phenology table from {csv_path} ...")
    table = build_table(csv_path)

    # Merge with existing hardcoded table (CSV data takes priority)
    existing_path = _BACKEND_DATA / "phenology_base.json"
    with open(existing_path) as f:
        existing = json.load(f)

    for taxon_id, data in table.items():
        if taxon_id in existing:
            existing[taxon_id]["lat_bands"].update(data["lat_bands"])
        else:
            existing[taxon_id] = data

    with open(existing_path, "w") as f:
        json.dump(existing, f, indent=2)

    print(f"Updated {existing_path} with {len(table)} species from CSV.")
