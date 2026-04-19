"""iNaturalist delta fetcher — Person B implements this."""
import asyncio
from datetime import date, timedelta
from typing import Optional

import h3
import httpx

from config import H3_RESOLUTION

_INAT_BASE = "https://api.inaturalist.org/v1/observations"
_FLOWERING_TERM_VALUE = 13   # Flowering
_BUDDING_TERM_VALUE   = 15   # Flower Budding
_PLANT_PHENOLOGY_TERM = 12


def _bbox_from_cells(h3_cells: list[str]) -> dict[str, float]:
    """Compute bounding box that covers all given H3 cells."""
    lats, lngs = [], []
    for cell in h3_cells:
        lat, lng = h3.cell_to_latlng(cell)
        lats.append(lat)
        lngs.append(lng)
    return {
        "swlat": min(lats) - 0.3,
        "swlng": min(lngs) - 0.3,
        "nelat": max(lats) + 0.3,
        "nelng": max(lngs) + 0.3,
    }


async def _fetch_observations_page(
    client: httpx.AsyncClient,
    taxon_id: int,
    bbox: dict[str, float],
    since_date: str,
    term_value_id: int,
    id_above: Optional[int] = None,
) -> dict:
    params = {
        "taxon_id":       taxon_id,
        "quality_grade":  "research",
        "d1":             since_date,
        "swlat":          bbox["swlat"],
        "swlng":          bbox["swlng"],
        "nelat":          bbox["nelat"],
        "nelng":          bbox["nelng"],
        "term_id":        _PLANT_PHENOLOGY_TERM,
        "term_value_id":  term_value_id,
        "per_page":       200,
        "order_by":       "observed_on",
        "order":          "desc",
    }
    if id_above:
        params["id_above"] = id_above

    resp = await client.get(_INAT_BASE, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _parse_phenology_stage(obs: dict) -> str:
    """Extract phenology stage from iNat annotation or infer from term value."""
    for annotation in obs.get("annotations", []):
        if annotation.get("controlled_attribute_id") == _PLANT_PHENOLOGY_TERM:
            value_id = annotation.get("controlled_value_id")
            if value_id == _FLOWERING_TERM_VALUE:
                return "EARLY_BLOOM"
            if value_id == _BUDDING_TERM_VALUE:
                return "BUDDING"
    return "EARLY_BLOOM"  # default for untagged observations


def _parse_observation(obs: dict) -> dict:
    lat = obs.get("location", "0,0").split(",")[0]
    lng = obs.get("location", "0,0").split(",")[1]
    try:
        lat_f, lng_f = float(lat), float(lng)
        cell = h3.latlng_to_cell(lat_f, lng_f, H3_RESOLUTION)
    except (ValueError, Exception):
        cell = ""

    return {
        "id":              str(obs["id"]),
        "taxon_id":        obs.get("taxon", {}).get("id"),
        "species_name":    obs.get("taxon", {}).get("preferred_common_name") or obs.get("taxon", {}).get("name", ""),
        "observed_on":     obs.get("observed_on", ""),
        "observed_at":     obs.get("observed_on", "") + "T12:00:00",
        "lat":             lat_f if lat else None,
        "lng":             lng_f if lng else None,
        "h3_cell":         cell,
        "phenology_stage": _parse_phenology_stage(obs),
        "quality_grade":   obs.get("quality_grade", ""),
    }


async def fetch_inat_delta(
    bbox: dict[str, float],
    since_days: int = 7,
) -> list[dict]:
    """Fetch recent research-grade flowering observations for all allergen species."""
    from config import ALLERGEN_SPECIES

    since_date = (date.today() - timedelta(days=since_days)).isoformat()
    all_obs: dict[str, dict] = {}  # dedup by ID

    async with httpx.AsyncClient() as client:
        for species in ALLERGEN_SPECIES:
            taxon_id = species["taxon_id"]

            for term_value in (_FLOWERING_TERM_VALUE, _BUDDING_TERM_VALUE):
                page_data = await _fetch_observations_page(
                    client, taxon_id, bbox, since_date, term_value
                )
                for obs in page_data.get("results", []):
                    parsed = _parse_observation(obs)
                    all_obs[parsed["id"]] = parsed

                # Paginate if needed
                total = page_data.get("total_results", 0)
                if total > 200 and page_data.get("results"):
                    last_id = page_data["results"][-1]["id"]
                    await asyncio.sleep(1)
                    page2 = await _fetch_observations_page(
                        client, taxon_id, bbox, since_date, term_value, id_above=last_id
                    )
                    for obs in page2.get("results", []):
                        parsed = _parse_observation(obs)
                        all_obs[parsed["id"]] = parsed

                await asyncio.sleep(1)  # respect rate limit

    return list(all_obs.values())
