import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from phenology_engine import (
    _compute_stage,
    _get_lat_band,
    _get_base_phenology,
    _index_to_severity,
    compute_day_forecast,
)


def test_lat_band():
    assert _get_lat_band(32.71)  == "30-35"
    assert _get_lat_band(40.0)   == "40-45"
    assert _get_lat_band(25.0)   == "25-30"
    assert _get_lat_band(49.9)   == "45-50"


def test_get_base_phenology_known_species():
    result = _get_base_phenology(56928, 32.71)  # White oak at San Diego lat
    assert result is not None
    assert "onset_doy" in result
    assert "peak_doy"  in result
    assert "duration"  in result
    assert result["onset_doy"] < result["peak_doy"]
    assert result["duration"] > 0


def test_get_base_phenology_unknown_species():
    result = _get_base_phenology(99999, 32.71)
    assert result is None


def test_compute_stage_dormant():
    stage, prob = _compute_stage(10, 100, 130, 40)
    assert stage == "DORMANT"
    assert prob == 0.0


def test_compute_stage_budding():
    stage, prob = _compute_stage(90, 100, 130, 40)
    assert stage == "BUDDING"
    assert 0.0 < prob < 0.15


def test_compute_stage_early_bloom():
    stage, prob = _compute_stage(105, 100, 130, 40)
    assert stage == "EARLY_BLOOM"
    assert 0.25 <= prob <= 0.70


def test_compute_stage_peak_bloom():
    stage, prob = _compute_stage(130, 100, 130, 40)
    assert stage == "PEAK_BLOOM"
    assert prob >= 0.80


def test_compute_stage_late_bloom():
    # onset=100, peak=130, duration=40 → end=140; peak_end ≈ 135 → late range is 135-140
    stage, prob = _compute_stage(137, 100, 130, 40)
    assert stage == "LATE_BLOOM"
    assert 0.0 < prob < 0.80


def test_compute_stage_post_bloom():
    stage, prob = _compute_stage(180, 100, 130, 40)
    assert stage == "POST_BLOOM"
    assert prob == 0.0


def test_index_to_severity():
    assert _index_to_severity(0.5)  == "low"
    assert _index_to_severity(2.0)  == "moderate"
    assert _index_to_severity(3.0)  == "high"
    assert _index_to_severity(4.5)  == "very_high"


def test_compute_day_forecast_shape():
    forecast = compute_day_forecast(32.71, -117.16, day_offset=0)
    assert "date" in forecast
    assert "composite_index" in forecast
    assert "severity" in forecast
    assert "top_species" in forecast
    assert isinstance(forecast["top_species"], list)
    assert 0.0 <= forecast["composite_index"] <= 5.0
    assert forecast["severity"] in ("low", "moderate", "high", "very_high")
    assert forecast["confidence_tier"] == "high"


def test_compute_day_forecast_extended_tier():
    forecast = compute_day_forecast(32.71, -117.16, day_offset=7)
    assert forecast["confidence_tier"] == "estimated"
