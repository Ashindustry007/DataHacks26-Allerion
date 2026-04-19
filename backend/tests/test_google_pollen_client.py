import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import ALLERGEN_SPECIES, GOOGLE_TO_INAT_MAP  # noqa: E402
from google_pollen_client import (  # noqa: E402
    _parse_daily_info,
    build_fourteen_day_series,
    extract_upi_for_google_code,
    fetch_google_pollen,
    inat_taxon_ids_for_google_plant,
    parse_lookup_response_body,
)


def test_inat_taxon_ids_for_google_plant():
    ids = inat_taxon_ids_for_google_plant("OAK")
    assert 56928 in ids and 56891 in ids
    assert inat_taxon_ids_for_google_plant("oak") == ids
    assert inat_taxon_ids_for_google_plant("UNKNOWN") == []


def test_parse_daily_info_types_and_plants():
    day = {
        "date": {"year": 2026, "month": 4, "day": 18},
        "pollenTypeInfo": [
            {"code": "TREE", "indexInfo": {"value": 3}},
            {"code": "GRASS", "indexInfo": {"value": 1}},
        ],
        "plantInfo": [
            {"code": "OAK", "indexInfo": {"value": 4}},
            {"code": "RAGWEED", "indexInfo": {"value": 0}},
        ],
    }
    p = _parse_daily_info(day)
    assert p["date"] == "2026-04-18"
    assert p["types"]["TREE"]["upi"] == 3
    assert p["types"]["GRASS"]["upi"] == 1
    assert p["plants"]["OAK"]["upi"] == 4
    assert p["plants"]["RAGWEED"]["upi"] == 0


def test_build_fourteen_day_series_full_five_days():
    daily = [
        {
            "date": {"year": 2026, "month": 4, "day": int(18 + i)},
            "pollenTypeInfo": [{"code": "TREE", "indexInfo": {"value": 2}}],
            "plantInfo": [],
        }
        for i in range(5)
    ]
    series = build_fourteen_day_series(daily)
    assert len(series) == 14
    assert all(series[i] is not None for i in range(5))
    assert all(series[i] is None for i in range(5, 14))


def test_build_fourteen_day_series_short_response_pads_front():
    """Fewer than 5 API days → None in missing slots 0–4, then days 5–13 None."""
    daily = [
        {
            "date": {"year": 2026, "month": 4, "day": 18},
            "pollenTypeInfo": [],
            "plantInfo": [{"code": "OAK", "indexInfo": {"value": 3}}],
        }
    ]
    series = build_fourteen_day_series(daily)
    assert series[0] is not None
    assert series[0]["plants"]["OAK"]["upi"] == 3
    assert series[1] is None
    assert series[4] is None
    assert all(series[i] is None for i in range(5, 14))


def test_parse_lookup_response_body():
    raw = {
        "dailyInfo": [
            {
                "date": {"year": 2026, "month": 4, "day": 18},
                "pollenTypeInfo": [{"code": "WEED", "indexInfo": {"value": 2}}],
                "plantInfo": [],
            }
        ]
    }
    out = parse_lookup_response_body(raw)
    assert len(out) == 14
    assert out[0]["types"]["WEED"]["upi"] == 2
    assert out[1] is None
    assert out[13] is None


def test_parse_daily_info_empty_date():
    p = _parse_daily_info({"pollenTypeInfo": [], "plantInfo": []})
    assert p["date"] == ""
    assert p["types"] == {}
    assert p["plants"] == {}


def test_extract_upi_prefers_plant_over_type():
    day = {
        "types":  {"TREE": {"upi": 2}},
        "plants": {"OAK": {"upi": 4}},
    }
    assert extract_upi_for_google_code(day, "OAK") == 4


def test_extract_upi_type_fallback():
    day = {
        "types":  {"TREE": {"upi": 3}, "GRASS": {"upi": 1}},
        "plants": {},
    }
    # Timothy grass → GRAMINALES → grass type
    assert extract_upi_for_google_code(day, "GRAMINALES") == 1


def test_allergen_google_codes_have_inat_mapping():
    codes = {s["google_code"] for s in ALLERGEN_SPECIES}
    for code in codes:
        assert code in GOOGLE_TO_INAT_MAP
        assert len(inat_taxon_ids_for_google_plant(code)) >= 1


def test_fetch_google_pollen_http_error_returns_fourteen_nones():
    async def _run():
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "quota",
            request=MagicMock(),
            response=MagicMock(status_code=429),
        )
        with patch("google_pollen_client.httpx.AsyncClient") as ac:
            ac.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
            with patch("google_pollen_client.GOOGLE_POLLEN_API_KEY", "not-placeholder"):
                out = await fetch_google_pollen(32.0, -117.0)
        assert len(out) == 14
        assert all(x is None for x in out)

    asyncio.run(_run())
