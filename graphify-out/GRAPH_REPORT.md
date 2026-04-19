# Graph Report - .  (2026-04-19)

## Corpus Check
- 46 files · ~45,094 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 298 nodes · 384 edges · 58 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.74)
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
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]

## God Nodes (most connected - your core abstractions)
1. `build_forecast_response()` - 11 edges
2. `ForecastResponse` - 10 edges
3. `PhotoClassifyResponse` - 10 edges
4. `_compute_stage()` - 10 edges
5. `generate_14day_forecast()` - 10 edges
6. `compute_day_forecast()` - 9 edges
7. `get_forecast()` - 8 edges
8. `_parse_observation()` - 7 edges
9. `fetch_inat_delta()` - 7 edges
10. `_get_base_phenology()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `ForecastResponse` --uses--> `Core forecast pipeline (Person B integrations + Person A phenology).      `with_`  [INFERRED]
  datahacks_26/backend/models.py → backend/main.py
- `ForecastResponse` --uses--> `Static fallback for when Gemini is unavailable.`  [INFERRED]
  datahacks_26/backend/models.py → backend/main.py
- `ForecastResponse` --uses--> `Static fallback for when Gemini is unavailable.`  [INFERRED]
  datahacks_26/backend/models.py → backend/main.py
- `PhotoClassifyResponse` --uses--> `Core forecast pipeline (Person B integrations + Person A phenology).      `with_`  [INFERRED]
  datahacks_26/backend/models.py → backend/main.py
- `PhotoClassifyResponse` --uses--> `Static fallback for when Gemini is unavailable.`  [INFERRED]
  datahacks_26/backend/models.py → backend/main.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (30): get_cached_forecast(), get_recent_observations(), Fetch observations from the last `since_hours` hours for the given H3 cells., save_forecast(), _call_gemini(), _extract_text_from_gemini_body(), generate_forecast_and_advisory(), generate_species_explanation() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (29): compute_day_forecast(), _compute_seasonal_shift(), compute_species_forecast(), _compute_stage(), _get_base_phenology(), _get_lat_band(), _inat_obs_count(), _index_to_severity() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (25): _bbox_from_cells(), fetch_inat_delta(), _fetch_observations_page(), _fetch_query_all_pages(), _inat_extra_params(), _inat_headers(), _merge_rank(), _parse_observation() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (24): build_fourteen_day_series(), _code_from_block(), extract_upi_for_google_code(), inat_taxon_ids_for_google_plant(), _parse_daily_info(), parse_lookup_response_body(), Google Pollen API client (Person B, hours 6–10).  forecast:lookup returns up to, Build a 14-element series from raw API `dailyInfo` (ordered oldest→newest or as (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (18): BaseModel, Batch write observations to Firestore or local cache., save_observations(), _fallback_narrative_advisory(), ingest_delta(), IngestRequest, PhotoRequest, Static fallback for when Gemini is unavailable. (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (13): _compute_pollen_index(), generate_14day_forecast(), Convert pollen_prob + allergenicity into 0-5 index, optionally calibrated by Goo, Generate 14 daily forecasts for a given location., test_generate_14day_forecast_confidence_tiers(), test_generate_14day_forecast_length(), test_generate_14day_forecast_offsets(), test_generate_14day_forecast_with_google() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.23
Nodes (11): _band_bbox(), build_from_inat(), _collect_doys(), _compute_stats(), _fetch_page(), merge_into_existing(), Fetch real historical flowering observations from iNaturalist and build phenolog, Compute onset, peak, duration from a list of day-of-year values. (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.44
Nodes (9): _banner(), _live_inat_delta_light(), _load_dotenv(), main(), One bbox; may take ~45s+ due to rate limits — optional., step_import_smoke(), step_live(), step_pytest() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (2): speciesBarColor(), SpeciesForecastRow()

### Community 9 - "Community 9"
Cohesion: 0.28
Nodes (7): _check_gemini(), _check_inat(), _gemini_error_detail(), _load_env(), main(), iNat is public; optional app id only affects rate limits., Extract Google error.message from JSON body for clearer 400/403 diagnostics.

### Community 10 - "Community 10"
Cohesion: 0.32
Nodes (4): buildMockForecast(), buildMockHeatmap(), getForecast(), getHeatmap()

### Community 11 - "Community 11"
Cohesion: 0.32
Nodes (7): generate_heatmap(), load_heatmap(), Generate GeoJSON FeatureCollection for H3 cells around a center point., Pre-compute and persist heatmap GeoJSON to a file., Load a pre-computed heatmap from disk., save_heatmap(), get_heatmap()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (2): Heatmap(), typeBreakdown()

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (3): build_table(), _lat_band(), One-time script to build phenology_base.json from a GBIF/iNat CSV export.  If th

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (2): INDEX_COLOR(), SpeciesCard()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (1): Seed Firestore (or local cache) with synthetic test observations for San Diego.

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): Pre-compute heatmap GeoJSON for a demo location and save to backend/data/. Run o

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): FCM push notification sender using the HTTP v1 API (legacy server key deprecated

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): Refresh credentials if needed and return a valid access token (sync).

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): Send a push notification via FCM HTTP v1 API.     Returns True if FCM accepted t

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): Refresh credentials if needed and return a valid access token (sync).

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Send a push notification via FCM HTTP v1 API.     Returns True if FCM accepted t

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Pre-compute and persist heatmap GeoJSON to a file.

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Load a pre-computed heatmap from disk.

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Agent 3 — species explainer for photo classifier results.      Returns: { "expla

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Compute bounding box that covers all given H3 cells.

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Extract phenology stage from iNat annotation or infer from term value.

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Fetch recent research-grade flowering observations for all allergen species.

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Return (stage, pollen_prob) for a given day of year.

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Estimate how many days ahead/behind base phenology is this season from iNat obs.

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Convert pollen_prob + allergenicity into 0-5 index, optionally calibrated by Goo

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Pull the per-species UPI out of a Google Pollen day dict.

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): Compute a single DailyForecast dict for one location + day_offset.

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): Generate 14 daily forecasts for a given location.

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): Classify a user-submitted plant photo.      Returns dict matching PhotoClassifyR

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): Single Gemini call that returns both narrative and advisory dicts.     Returns:

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Generate a species-specific explanation and action for the photo classifier.

## Knowledge Gaps
- **66 isolated node(s):** `Batch write observations to Firestore or local cache.`, `Fetch observations from the last `since_hours` hours for the given H3 cells.`, `iNaturalist delta fetcher (Person B, hours 2–6).  Per plan: flowering + budding`, `Optional OAuth client id for registered iNat applications.`, `Compute bounding box that covers all given H3 cells.` (+61 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 23`** (2 nodes): `App.tsx`, `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `PollenIndex.jsx`, `PollenIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `PollenBackground.jsx`, `PollenBackground()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `AdvisoryPanel()`, `AdvisoryPanel.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `generate_heatmap.py`, `Pre-compute heatmap GeoJSON for a demo location and save to backend/data/. Run o`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `config.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `FCM push notification sender using the HTTP v1 API (legacy server key deprecated`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `Refresh credentials if needed and return a valid access token (sync).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `Send a push notification via FCM HTTP v1 API.     Returns True if FCM accepted t`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `Refresh credentials if needed and return a valid access token (sync).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Send a push notification via FCM HTTP v1 API.     Returns True if FCM accepted t`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Pre-compute and persist heatmap GeoJSON to a file.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Load a pre-computed heatmap from disk.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Agent 3 — species explainer for photo classifier results.      Returns: { "expla`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Compute bounding box that covers all given H3 cells.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Extract phenology stage from iNat annotation or infer from term value.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Fetch recent research-grade flowering observations for all allergen species.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `Return (stage, pollen_prob) for a given day of year.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Estimate how many days ahead/behind base phenology is this season from iNat obs.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Convert pollen_prob + allergenicity into 0-5 index, optionally calibrated by Goo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Pull the per-species UPI out of a Google Pollen day dict.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `Compute a single DailyForecast dict for one location + day_offset.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `Generate 14 daily forecasts for a given location.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `Classify a user-submitted plant photo.      Returns dict matching PhotoClassifyR`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `Single Gemini call that returns both narrative and advisory dicts.     Returns:`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `Generate a species-specific explanation and action for the photo classifier.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `build_forecast_response()` connect `Community 0` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `generate_14day_forecast()` connect `Community 5` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `fetch_google_pollen()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `build_forecast_response()` (e.g. with `get_cached_forecast()` and `get_recent_observations()`) actually correct?**
  _`build_forecast_response()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `ForecastResponse` (e.g. with `PhotoRequest` and `Region`) actually correct?**
  _`ForecastResponse` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `PhotoClassifyResponse` (e.g. with `PhotoRequest` and `Region`) actually correct?**
  _`PhotoClassifyResponse` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `_compute_stage()` (e.g. with `test_compute_stage_dormant()` and `test_compute_stage_budding()`) actually correct?**
  _`_compute_stage()` has 6 INFERRED edges - model-reasoned connections that need verification._