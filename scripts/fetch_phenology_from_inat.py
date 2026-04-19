"""
Fetch real historical flowering observations from iNaturalist and build
phenology_base.json from actual data (2018-2026, research-grade, Flowering annotations).

For each of the 15 allergen species × 5 lat bands:
  - Query iNat for Flowering-annotated observations
  - Collect day-of-year values across all years
  - Compute onset (10th pct), peak (median), duration (90th - 10th pct)
  - If fewer than MIN_OBS observations, keep existing hardcoded values

Takes ~5-8 minutes due to 1 req/sec rate-limit compliance.
"""
import asyncio
import json
import statistics
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from config import ALLERGEN_SPECIES

_INAT_BASE       = "https://api.inaturalist.org/v1/observations"
_PHENOLOGY_TERM  = 12
_FLOWERING_VALUE = 13   # Flowering
_BUDDING_VALUE   = 15   # Flower Budding
_LAT_BANDS       = ["25-30", "30-35", "35-40", "40-45", "45-50"]
_MIN_OBS         = 5    # minimum observations to trust the stats
_SINCE_DATE      = "2018-01-01"
_BACKEND_DATA    = Path(__file__).parent.parent / "backend" / "data"

# Wide longitude range covering contiguous US + southern Canada
_BBOX_WEST = -125.0
_BBOX_EAST = -65.0


def _band_bbox(band: str) -> dict[str, float]:
    lo, hi = map(int, band.split("-"))
    return {
        "swlat": float(lo),
        "swlng": _BBOX_WEST,
        "nelat": float(hi),
        "nelng": _BBOX_EAST,
    }


async def _fetch_page(client: httpx.AsyncClient, taxon_id: int, bbox: dict,
                      term_value: int, id_above: int | None = None) -> dict:
    params = {
        "taxon_id":      taxon_id,
        "quality_grade": "research",
        "d1":            _SINCE_DATE,
        "swlat":         bbox["swlat"],
        "swlng":         bbox["swlng"],
        "nelat":         bbox["nelat"],
        "nelng":         bbox["nelng"],
        "term_id":       _PHENOLOGY_TERM,
        "term_value_id": term_value,
        "per_page":      200,
        "order_by":      "observed_on",
        "order":         "asc",
    }
    if id_above:
        params["id_above"] = id_above
    resp = await client.get(_INAT_BASE, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


async def _collect_doys(client: httpx.AsyncClient, taxon_id: int, band: str) -> list[int]:
    """Return list of flowering day-of-year values for species in lat band."""
    bbox = _band_bbox(band)
    doys: list[int] = []
    seen_ids: set[int] = set()

    for term_value in (_FLOWERING_VALUE, _BUDDING_VALUE):
        page = await _fetch_page(client, taxon_id, bbox, term_value)
        await asyncio.sleep(1)

        results = page.get("results", [])
        total   = page.get("total_results", 0)

        for obs in results:
            obs_id = obs["id"]
            if obs_id in seen_ids:
                continue
            seen_ids.add(obs_id)
            observed_on = obs.get("observed_on", "")
            if not observed_on:
                continue
            try:
                doy = date.fromisoformat(observed_on).timetuple().tm_yday
                doys.append(doy)
            except ValueError:
                continue

        # One extra page if there are more than 200 results
        if total > 200 and results:
            last_id = results[-1]["id"]
            page2   = await _fetch_page(client, taxon_id, bbox, term_value, id_above=last_id)
            await asyncio.sleep(1)
            for obs in page2.get("results", []):
                obs_id = obs["id"]
                if obs_id in seen_ids:
                    continue
                seen_ids.add(obs_id)
                observed_on = obs.get("observed_on", "")
                if not observed_on:
                    continue
                try:
                    doy = date.fromisoformat(observed_on).timetuple().tm_yday
                    doys.append(doy)
                except ValueError:
                    continue

    return doys


def _compute_stats(doys: list[int]) -> dict:
    """Compute onset, peak, duration from a list of day-of-year values."""
    s = sorted(doys)
    n = len(s)
    onset_doy = s[max(0, int(n * 0.10))]
    peak_doy  = int(statistics.median(s))
    end_doy   = s[min(n - 1, int(n * 0.90))]
    return {
        "onset_doy": onset_doy,
        "peak_doy":  peak_doy,
        "duration":  max(10, end_doy - onset_doy),
    }


async def build_from_inat() -> dict:
    """Query iNat and return a species→band→stats mapping."""
    results: dict[str, dict[str, dict]] = defaultdict(dict)

    async with httpx.AsyncClient(timeout=30) as client:
        for species in ALLERGEN_SPECIES:
            taxon_id  = species["taxon_id"]
            name      = species["name"]

            for band in _LAT_BANDS:
                print(f"  Fetching {name:25s} band {band} ...", end=" ", flush=True)
                try:
                    doys = await _collect_doys(client, taxon_id, band)
                except Exception as e:
                    print(f"ERROR: {e}")
                    continue

                if len(doys) >= _MIN_OBS:
                    stats = _compute_stats(doys)
                    results[str(taxon_id)][band] = stats
                    print(f"{len(doys):4d} obs → onset={stats['onset_doy']} peak={stats['peak_doy']} dur={stats['duration']}")
                else:
                    print(f"{len(doys):4d} obs → too few, keeping hardcoded")

    return dict(results)


def merge_into_existing(new_data: dict) -> dict:
    """Merge iNat-derived stats into existing JSON, iNat data takes priority."""
    existing_path = _BACKEND_DATA / "phenology_base.json"
    with open(existing_path) as f:
        existing = json.load(f)

    updated_species = 0
    updated_bands   = 0

    for taxon_id, band_data in new_data.items():
        if taxon_id not in existing:
            print(f"  Warning: taxon {taxon_id} not in existing table, skipping")
            continue
        for band, stats in band_data.items():
            existing[taxon_id]["lat_bands"][band] = stats
            updated_bands += 1
        updated_species += 1

    print(f"\nUpdated {updated_bands} lat-band entries across {updated_species} species.")
    return existing


if __name__ == "__main__":
    print(f"Fetching iNat flowering data since {_SINCE_DATE} ...")
    print(f"Coverage: lat bands {_LAT_BANDS}, lon {_BBOX_WEST}–{_BBOX_EAST}")
    print(f"Minimum {_MIN_OBS} observations required to override hardcoded value")
    print(f"Estimated time: ~8-10 minutes (rate-limited to 1 req/sec)")
    print()

    new_data = asyncio.run(build_from_inat())

    if not new_data:
        print("No data fetched — keeping existing phenology_base.json unchanged.")
        sys.exit(0)

    merged = merge_into_existing(new_data)

    output_path = _BACKEND_DATA / "phenology_base.json"
    with open(output_path, "w") as f:
        json.dump(merged, f, indent=2)

    print(f"Saved updated phenology table → {output_path}")
