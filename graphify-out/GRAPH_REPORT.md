# Graph Report - .  (2026-04-19)

## Corpus Check
- 16 files · ~10,859 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 142 nodes · 173 edges · 39 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `_compute_stage()` - 9 edges
2. `compute_day_forecast()` - 9 edges
3. `generate_14day_forecast()` - 9 edges
4. `get_forecast()` - 9 edges
5. `ForecastResponse` - 8 edges
6. `PhotoClassifyResponse` - 8 edges
7. `_compute_pollen_index()` - 7 edges
8. `compute_species_forecast()` - 7 edges
9. `_get_base_phenology()` - 6 edges
10. `_compute_seasonal_shift()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `get_forecast()` --calls--> `save_forecast()`  [INFERRED]
  backend/main.py → datahacks_26/backend/firestore_client.py
- `get_forecast()` --calls--> `get_cached_forecast()`  [INFERRED]
  backend/main.py → datahacks_26/backend/firestore_client.py
- `generate_heatmap()` --calls--> `compute_day_forecast()`  [INFERRED]
  datahacks_26/backend/heatmap_generator.py → backend/phenology_engine.py
- `_compute_seasonal_shift()` --calls--> `test_seasonal_shift_no_obs()`  [INFERRED]
  backend/phenology_engine.py → datahacks_26/backend/tests/test_fusion.py
- `_compute_seasonal_shift()` --calls--> `test_seasonal_shift_clamped()`  [INFERRED]
  backend/phenology_engine.py → datahacks_26/backend/tests/test_fusion.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (23): compute_day_forecast(), compute_species_forecast(), _compute_stage(), _extract_google_upi(), _get_base_phenology(), _get_lat_band(), _inat_obs_count(), _index_to_severity() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (17): _compute_pollen_index(), _compute_seasonal_shift(), generate_14day_forecast(), Convert pollen_prob + allergenicity into 0-5 index, optionally calibrated by Goo, Generate 14 daily forecasts for a given location., Estimate how many days ahead/behind base phenology is this season from iNat obs., test_generate_14day_forecast_confidence_tiers(), test_generate_14day_forecast_length() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (15): get_cached_forecast(), get_recent_observations(), Fetch observations from the last `since_hours` hours for the given H3 cells., save_forecast(), _call_gemini(), generate_forecast_and_advisory(), generate_species_explanation(), Gemini LLM agents — Person B, hours 10–14.  Three logical agents (Agents 1+2 bat (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.26
Nodes (13): BaseModel, _fallback_narrative_advisory(), IngestRequest, PhotoRequest, Static fallback for when Gemini is unavailable., Core forecast pipeline (Person B integrations + Person A phenology).      `with_, Static fallback for when Gemini is unavailable., Region (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (12): Batch write observations to Firestore or local cache., save_observations(), _bbox_from_cells(), fetch_inat_delta(), _fetch_observations_page(), _parse_observation(), _parse_phenology_stage(), iNaturalist delta fetcher (Person B, hours 2–6).  Per plan: flowering + budding (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.32
Nodes (7): generate_heatmap(), load_heatmap(), Generate GeoJSON FeatureCollection for H3 cells around a center point., Pre-compute and persist heatmap GeoJSON to a file., Load a pre-computed heatmap from disk., save_heatmap(), get_heatmap()

### Community 6 - "Community 6"
Cohesion: 0.4
Nodes (5): fetch_google_pollen(), _parse_daily_info(), Google Pollen API client (Person B, hours 6–10).  forecast:lookup returns up to, Resolve UPI (0–5) for one allergen species from a normalized Google day dict., Return iNat taxon IDs that correspond to a Google Pollen plant genus code.

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (3): build_table(), _lat_band(), One-time script to build phenology_base.json from a GBIF/iNat CSV export.  If th

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (1): Seed Firestore (or local cache) with synthetic test observations for San Diego.

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (1): Pre-compute heatmap GeoJSON for a demo location and save to backend/data/. Run o

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (1): Optional OAuth client id for registered iNat applications.

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (1): Compute bounding box that covers all given H3 cells.

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (1): Map iNat Plant Phenology value id to our stage enum.

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (1): Returns (stage or None, matched_flowering_or_budding_annotation).

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (1): Prefer annotation over inferred; then higher stage rank.

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (1): Fetch every page for one (taxon, bbox, optional phenology term) query.

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (1): Fetch recent research-grade observations for all allergen species.      For each

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): Return (stage, pollen_prob) for a given day of year.

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (1): When an iNat observation has no Plant Phenology annotation, infer     DORMANT..P

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): Estimate how many days ahead/behind base phenology is this season from iNat obs.

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): Convert pollen_prob + allergenicity into 0-5 index, optionally calibrated by Goo

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): Compute a single DailyForecast dict for one location + day_offset.

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): Generate 14 daily forecasts for a given location.

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): Extract UPI (0–5) from pollenTypeInfo or plantInfo element.

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): Normalise one dailyInfo object into types/plants dicts keyed by UPPERCASE code.

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): Build a 14-element series from raw API `dailyInfo` (ordered oldest→newest or as

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (1): Parse a JSON object from forecast:lookup (no HTTP). Used by tests and tooling.

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (1): Call Google Pollen API and return 14 elements: indices 0–4 may contain day dicts

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (1): Classify a user-submitted plant photo.      Returns dict matching PhotoClassifyR

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): Strip optional markdown fences and parse JSON (shared with photo_classifier).

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): Call Gemini with JSON response mode; retry the HTTP request if JSON parse fails

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): Agents 1 + 2 in a single Gemini call (batched for speed).      Returns:

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): Agent 3 — species explainer for photo classifier results.      Returns: { "expla

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Fewer than 5 API days → None in missing slots 0–4, then days 5–13 None.

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): iNat is public; optional app id only affects rate limits.

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Extract Google error.message from JSON body for clearer 400/403 diagnostics.

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): One bbox; may take ~45s+ due to rate limits — optional.

## Knowledge Gaps
- **53 isolated node(s):** `Batch write observations to Firestore or local cache.`, `Fetch observations from the last `since_hours` hours for the given H3 cells.`, `iNaturalist delta fetcher (Person B, hours 2–6).  Per plan: flowering + budding`, `Compute bounding box that covers all given H3 cells.`, `Extract phenology stage from iNat annotation or infer from term value.` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (2 nodes): `generate_heatmap.py`, `Pre-compute heatmap GeoJSON for a demo location and save to backend/data/. Run o`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (1 nodes): `config.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (1 nodes): `Optional OAuth client id for registered iNat applications.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `Compute bounding box that covers all given H3 cells.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `Map iNat Plant Phenology value id to our stage enum.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `Returns (stage or None, matched_flowering_or_budding_annotation).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `Prefer annotation over inferred; then higher stage rank.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `Fetch every page for one (taxon, bbox, optional phenology term) query.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `Fetch recent research-grade observations for all allergen species.      For each`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `Return (stage, pollen_prob) for a given day of year.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `When an iNat observation has no Plant Phenology annotation, infer     DORMANT..P`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `Estimate how many days ahead/behind base phenology is this season from iNat obs.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `Convert pollen_prob + allergenicity into 0-5 index, optionally calibrated by Goo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `Compute a single DailyForecast dict for one location + day_offset.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Generate 14 daily forecasts for a given location.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `Extract UPI (0–5) from pollenTypeInfo or plantInfo element.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `Normalise one dailyInfo object into types/plants dicts keyed by UPPERCASE code.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `Build a 14-element series from raw API `dailyInfo` (ordered oldest→newest or as`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `Parse a JSON object from forecast:lookup (no HTTP). Used by tests and tooling.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `Call Google Pollen API and return 14 elements: indices 0–4 may contain day dicts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `Classify a user-submitted plant photo.      Returns dict matching PhotoClassifyR`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `Strip optional markdown fences and parse JSON (shared with photo_classifier).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `Call Gemini with JSON response mode; retry the HTTP request if JSON parse fails`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `Agents 1 + 2 in a single Gemini call (batched for speed).      Returns:`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `Agent 3 — species explainer for photo classifier results.      Returns: { "expla`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Fewer than 5 API days → None in missing slots 0–4, then days 5–13 None.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `iNat is public; optional app id only affects rate limits.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Extract Google error.message from JSON body for clearer 400/403 diagnostics.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `One bbox; may take ~45s+ due to rate limits — optional.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_forecast()` connect `Community 2` to `Community 1`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.285) - this node is a cross-community bridge._
- **Why does `generate_14day_forecast()` connect `Community 1` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `ingest_delta()` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `_compute_stage()` (e.g. with `test_compute_stage_dormant()` and `test_compute_stage_budding()`) actually correct?**
  _`_compute_stage()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `compute_day_forecast()` (e.g. with `generate_heatmap()` and `test_compute_day_forecast_shape()`) actually correct?**
  _`compute_day_forecast()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `generate_14day_forecast()` (e.g. with `get_forecast()` and `test_generate_14day_forecast_length()`) actually correct?**
  _`generate_14day_forecast()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `get_forecast()` (e.g. with `get_cached_forecast()` and `get_recent_observations()`) actually correct?**
  _`get_forecast()` has 6 INFERRED edges - model-reasoned connections that need verification._