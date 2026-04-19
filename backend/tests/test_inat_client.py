import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from inat_client import (  # noqa: E402
    _merge_rank,
    _parse_observation,
    _should_replace,
)


def _sample_obs(**overrides):
    base = {
        "id": 42,
        "location": "32.71,-117.16",
        "observed_on": "2026-04-10",
        "taxon": {
            "id": 56928,
            "name": "Quercus alba",
            "preferred_common_name": "White oak",
        },
        "annotations": [],
        "quality_grade": "research",
    }
    base.update(overrides)
    return base


def test_parse_annotation_flowering_maps_to_peak():
    obs = _sample_obs(
        annotations=[
            {"controlled_attribute_id": 12, "controlled_value_id": 13},
        ],
    )
    p = _parse_observation(obs)
    assert p["phenology_stage"] == "PEAK_BLOOM"
    assert p["phenology_source"] == "annotation"


def test_parse_annotation_budding():
    obs = _sample_obs(
        annotations=[
            {"controlled_attribute_id": 12, "controlled_value_id": 15},
        ],
    )
    p = _parse_observation(obs)
    assert p["phenology_stage"] == "BUDDING"


def test_parse_no_annotation_uses_base_table():
    obs = _sample_obs(annotations=[])
    p = _parse_observation(obs)
    assert p["phenology_source"] == "inferred"
    assert p["phenology_stage"] in (
        "DORMANT",
        "BUDDING",
        "EARLY_BLOOM",
        "PEAK_BLOOM",
        "LATE_BLOOM",
        "POST_BLOOM",
    )


def test_merge_prefers_annotation_over_inferred():
    inferred = {
        "phenology_stage": "PEAK_BLOOM",
        "phenology_source": "inferred",
    }
    annotated = {
        "phenology_stage": "BUDDING",
        "phenology_source": "annotation",
    }
    assert _merge_rank(annotated) > _merge_rank(inferred)
    assert _should_replace(inferred, annotated)


def test_merge_keeps_stronger_annotation():
    old = {"phenology_stage": "BUDDING", "phenology_source": "annotation"}
    new = {"phenology_stage": "PEAK_BLOOM", "phenology_source": "annotation"}
    assert _should_replace(old, new)
