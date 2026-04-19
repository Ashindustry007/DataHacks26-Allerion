import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from phenology_engine import (
    _compute_pollen_index,
    _compute_seasonal_shift,
    generate_14day_forecast,
)


def test_pollen_index_no_google():
    idx = _compute_pollen_index(0.8, 4, None)
    assert 0.0 <= idx <= 5.0


def test_pollen_index_with_google_blends():
    idx_no_google  = _compute_pollen_index(0.8, 4, None)
    idx_google_low = _compute_pollen_index(0.8, 4, 1)
    idx_google_high = _compute_pollen_index(0.8, 4, 5)
    # Google UPI=1 should pull index down; UPI=5 should pull up
    assert idx_google_low < idx_no_google
    assert idx_google_high > idx_no_google


def test_pollen_index_zero_prob():
    idx = _compute_pollen_index(0.0, 5, None)
    assert idx == 0.0


def test_pollen_index_capped_at_5():
    idx = _compute_pollen_index(1.0, 5, 5)
    assert idx <= 5.0


def test_seasonal_shift_no_obs():
    shift = _compute_seasonal_shift(56928, [], 32.71)
    assert shift == 0


def test_seasonal_shift_clamped():
    # Simulate obs 30 days early → should be clamped to -20
    early_obs = [
        {"taxon_id": 56928, "observed_on": "2026-02-01", "phenology_stage": "PEAK_BLOOM"}
        for _ in range(5)
    ]
    shift = _compute_seasonal_shift(56928, early_obs, 32.71)
    assert -20 <= shift <= 20


def test_generate_14day_forecast_length():
    daily = generate_14day_forecast(32.71, -117.16)
    assert len(daily) == 14


def test_generate_14day_forecast_offsets():
    daily = generate_14day_forecast(32.71, -117.16)
    for i, day in enumerate(daily):
        assert day["day_offset"] == i


def test_generate_14day_forecast_confidence_tiers():
    daily = generate_14day_forecast(32.71, -117.16)
    for day in daily[:5]:
        assert day["confidence_tier"] == "high"
    for day in daily[5:]:
        assert day["confidence_tier"] == "estimated"


def test_generate_14day_forecast_with_inat():
    inat_obs = [
        {"taxon_id": 56928, "observed_on": "2026-04-15", "phenology_stage": "PEAK_BLOOM",
         "h3_cell": "842a100ffffffff", "observed_at": "2026-04-15T10:00:00"}
    ]
    daily = generate_14day_forecast(32.71, -117.16, inat_obs=inat_obs)
    assert len(daily) == 14
    # iNat obs should appear in sources of white oak forecast for day 0
    oak_forecast = next(
        (s for s in daily[0]["top_species"] if s["species_id"] == 56928), None
    )
    if oak_forecast:
        assert "inat" in oak_forecast["sources"]


def test_generate_14day_forecast_with_google():
    google_data = [
        {
            "date":   "2026-04-18",
            "types":  {"TREE": {"upi": 4}, "GRASS": {"upi": 1}, "WEED": {"upi": 0}},
            "plants": {"OAK": {"upi": 4}},
        }
    ] + [None] * 13

    daily = generate_14day_forecast(32.71, -117.16, google_data=google_data)
    day0 = daily[0]
    oak = next((s for s in day0["top_species"] if s["species_id"] in (56928, 56891)), None)
    if oak:
        assert oak["google_upi"] is not None
