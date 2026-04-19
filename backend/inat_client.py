"""
iNaturalist delta fetcher (Person B, hours 2–6).

Per plan: flowering + budding + unfiltered queries per species, dedupe by obs id,
paginate with id_above, 1s between requests, H3 cells, phenology from annotations
or inferred from base phenology table (no LLM).
"""
from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Any, Optional

import h3
import httpx

from config import H3_RESOLUTION, INAT_APP_ID
from phenology_engine import infer_phenology_stage_from_base

_INAT_BASE = "https://api.inaturalist.org/v1/observations"
_PER_PAGE = 200

# Plant Phenology (controlled_attribute_id == 12)
_FLOWERING_TERM_VALUE = 13   # Flowering
_BUDDING_TERM_VALUE = 15     # Flower Budding
_PLANT_PHENOLOGY_TERM = 12

# Rank for merging duplicate observation ids (higher = preferred when both annotated)
_STAGE_MERGE_RANK: dict[str, int] = {
    "PEAK_BLOOM":  50,
    "EARLY_BLOOM": 45,
    "LATE_BLOOM":  40,
    "POST_BLOOM":  25,
    "BUDDING":     30,
    "DORMANT":     10,
}


def _inat_headers() -> dict[str, str]:
    ua = "PollenCast/1.0 (+https://github.com/)"
    if INAT_APP_ID and INAT_APP_ID not in ("your-inat-app-id",):
        ua = f"{ua} (iNat app id: {INAT_APP_ID})"
    return {"User-Agent": ua}


def _inat_extra_params() -> dict[str, str]:
    """Optional OAuth client id for registered iNat applications."""
    if INAT_APP_ID and INAT_APP_ID not in ("your-inat-app-id",):
        return {"client_id": INAT_APP_ID}
    return {}


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


def _stage_from_annotation_value(value_id: Optional[int]) -> Optional[str]:
    """Map iNat Plant Phenology value id to our stage enum."""
    if value_id == _FLOWERING_TERM_VALUE:
        return "PEAK_BLOOM"
    if value_id == _BUDDING_TERM_VALUE:
        return "BUDDING"
    return None


def _phenology_from_annotations(obs: dict) -> tuple[Optional[str], bool]:
    """Returns (stage or None, matched_flowering_or_budding_annotation)."""
    for annotation in obs.get("annotations", []):
        if annotation.get("controlled_attribute_id") != _PLANT_PHENOLOGY_TERM:
            continue
        vid = annotation.get("controlled_value_id")
        stage = _stage_from_annotation_value(vid)
        if stage is not None:
            return stage, True
    return None, False


def _parse_observation(obs: dict) -> dict:
    lat = obs.get("location", "0,0").split(",")[0]
    lng = obs.get("location", "0,0").split(",")[1]
    lat_f, lng_f = None, None
    cell = ""
    try:
        lat_f, lng_f = float(lat), float(lng)
        cell = h3.latlng_to_cell(lat_f, lng_f, H3_RESOLUTION)
    except (ValueError, Exception):
        pass

    taxon_id = obs.get("taxon", {}).get("id")
    observed_on = obs.get("observed_on", "") or ""

    stage, has_ann = _phenology_from_annotations(obs)
    source = "annotation"
    if stage is None:
        if taxon_id and lat_f is not None and observed_on:
            stage = infer_phenology_stage_from_base(int(taxon_id), lat_f, observed_on)
            source = "inferred"
        else:
            stage = "DORMANT"
            source = "inferred"

    return {
        "id":                 str(obs["id"]),
        "taxon_id":           taxon_id,
        "species_name":       obs.get("taxon", {}).get("preferred_common_name")
            or obs.get("taxon", {}).get("name", ""),
        "observed_on":        observed_on,
        "observed_at":        (observed_on + "T12:00:00") if observed_on else "",
        "lat":                lat_f,
        "lng":                lng_f,
        "h3_cell":            cell,
        "phenology_stage":    stage,
        "phenology_source":   source,
        "has_phenology_ann":  has_ann,
        "quality_grade":      obs.get("quality_grade", ""),
    }


def _merge_rank(parsed: dict) -> int:
    base = _STAGE_MERGE_RANK.get(parsed.get("phenology_stage", "DORMANT"), 0)
    if parsed.get("phenology_source") == "annotation":
        base += 100
    return base


def _should_replace(existing: dict, new: dict) -> bool:
    """Prefer annotation over inferred; then higher stage rank."""
    return _merge_rank(new) > _merge_rank(existing)


async def _fetch_observations_page(
    client: httpx.AsyncClient,
    taxon_id: int,
    bbox: dict[str, float],
    since_date: str,
    term_value_id: Optional[int],
    id_above: Optional[int] = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "taxon_id":       taxon_id,
        "quality_grade":  "research",
        "d1":             since_date,
        "swlat":          bbox["swlat"],
        "swlng":          bbox["swlng"],
        "nelat":          bbox["nelat"],
        "nelng":          bbox["nelng"],
        "per_page":       _PER_PAGE,
        "order_by":       "observed_on",
        "order":          "desc",
    }
    if term_value_id is not None:
        params["term_id"] = _PLANT_PHENOLOGY_TERM
        params["term_value_id"] = term_value_id
    if id_above is not None:
        params["id_above"] = id_above
    params.update(_inat_extra_params())

    resp = await client.get(_INAT_BASE, params=params, headers=_inat_headers(), timeout=30.0)
    resp.raise_for_status()
    return resp.json()


async def _fetch_query_all_pages(
    client: httpx.AsyncClient,
    taxon_id: int,
    bbox: dict[str, float],
    since_date: str,
    term_value_id: Optional[int],
) -> list[dict]:
    """Fetch every page for one (taxon, bbox, optional phenology term) query."""
    results: list[dict] = []
    total_results: Optional[int] = None
    id_above: Optional[int] = None
    first_page = True

    while True:
        if not first_page:
            await asyncio.sleep(1)
        first_page = False

        page_data = await _fetch_observations_page(
            client, taxon_id, bbox, since_date, term_value_id, id_above=id_above
        )
        if total_results is None:
            total_results = page_data.get("total_results", 0)
        batch = page_data.get("results", [])
        results.extend(batch)

        if not batch:
            break
        if len(batch) < _PER_PAGE:
            break
        if total_results is not None and len(results) >= total_results:
            break
        id_above = batch[-1]["id"]

    return results


async def fetch_inat_delta(
    bbox: dict[str, float],
    since_days: int = 7,
) -> list[dict]:
    """
    Fetch recent research-grade observations for all allergen species.

    For each species: query Flowering (term 13), Flower Budding (15), and
    unfiltered observations in the bbox (captures obs without phenology annotations).
    Results are deduplicated by observation id; annotation-backed rows beat inferred.
    """
    from config import ALLERGEN_SPECIES

    since_date = (date.today() - timedelta(days=since_days)).isoformat()
    all_obs: dict[str, dict] = {}

    query_modes: list[Optional[int]] = [
        _FLOWERING_TERM_VALUE,
        _BUDDING_TERM_VALUE,
        None,
    ]

    first_request = True

    async with httpx.AsyncClient() as client:
        for species in ALLERGEN_SPECIES:
            taxon_id = species["taxon_id"]

            for _term_value in query_modes:
                if not first_request:
                    await asyncio.sleep(1)
                first_request = False

                raw_list = await _fetch_query_all_pages(
                    client, taxon_id, bbox, since_date, _term_value
                )
                for obs in raw_list:
                    parsed = _parse_observation(obs)
                    prev = all_obs.get(parsed["id"])
                    if prev is None or _should_replace(prev, parsed):
                        all_obs[parsed["id"]] = parsed

    for row in all_obs.values():
        row.pop("has_phenology_ann", None)
        row.pop("phenology_source", None)

    return list(all_obs.values())
