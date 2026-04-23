<img width="2413" height="1316" alt="cover" src="https://github.com/user-attachments/assets/a6effddb-9411-43ea-882f-3423cfd00879" />

Species-specific pollen forecasting. Fuses iNaturalist citizen-science observations + Google Pollen API + a real phenology table to produce 14-day, neighborhood-level pollen forecasts per allergen species.

> "Tree pollen is high" → "*Red oak* peaks **Thursday** in **your neighborhood**, based on 12 observations this week."

---

## What's implemented

### Backend (FastAPI · Python 3.11)

**`backend/main.py`** — 5 API endpoints, CORS open, graceful degradation on every external call.

| Endpoint | Description |
|---|---|
| `GET /api/forecast?lat=&lng=` | 14-day species-level forecast, Gemini narrative + advisory, H3-keyed 6-hour cache |
| `POST /api/photo` | Base64 image → Gemini Vision species ID + phenology stage + local forecast |
| `GET /api/heatmap?lat=&lng=&radius_km=` | GeoJSON FeatureCollection of H3 hexagons with per-cell severity |
| `GET /api/species` | Static list of 15 tracked allergen species |
| `POST /api/ingest/delta` | Trigger iNat observation fetch for one or more regions (Cloud Scheduler target) |

**`backend/phenology_engine.py`** — Core forecasting logic.

- 6-stage bloom curve: `DORMANT → BUDDING → EARLY_BLOOM → PEAK_BLOOM → LATE_BLOOM → POST_BLOOM`
- Per-species `pollen_prob` (0–1) derived from day-of-year vs. onset/peak/duration
- Allergenicity-weighted `pollen_index` (0–5); blended 60/40 with Google UPI on days 0–4
- Seasonal shift: median flowering DOY from live iNat obs vs. base table, clamped ±20 days
- Confidence: `"high"` (days 0–4, Google-calibrated) → `"estimated"` (days 5–13, decays to ~0.58)

**`backend/inat_client.py`** — iNaturalist delta fetcher.

- Research-grade Flowering (term 13) + Budding (term 15) observations by bounding box
- Fetches all 15 allergen species; paginates beyond 200 results; 1 s rate-limit sleep
- H3-tags each observation at resolution 4 for spatial cache lookup

**`backend/google_pollen_client.py`** — Google Pollen API client.

- `forecast:lookup` → 5 days of per-plant UPI + per-type UPI
- Returns a 14-element list; indices 5–13 are `None` (Google caps at 5 days)
- Falls back to pollen-type UPI when plant-level UPI is absent

**`backend/gemini_agents.py`** — Gemini 2.5 Flash agents (REST JSON mode).

- **Agents 1+2 batched**: narrative (`headline`, `today_summary`, `seven_day`, `fourteen_day`) + advisory (`general_measures`, `species_tips`, `timing_advice`) in a single call
- **Agent 3**: species explainer for photo classifier results (`explanation` + `action`)
- Shared `parse_gemini_json_text` helper; retries on malformed JSON (`_MAX_JSON_RETRIES=2`)
- Guards `SAFETY`/`RECITATION`/`BLOCKLIST` finish reasons; validates API key on entry

**`backend/photo_classifier.py`** — Gemini Vision plant classifier.

- Sends base64 JPEG + location to Gemini Vision; returns species ID, allergen status, phenology stage, confidence
- Uses `inlineData`/`mimeType` (camelCase) — required by Gemini REST API; snake_case causes 400
- 3-attempt retry loop; shares `parse_gemini_json_text` with `gemini_agents`

**`backend/heatmap_generator.py`** — H3 hex grid GeoJSON.

- Expands H3 ring from center point, computes `compute_day_forecast` per cell
- Serves pre-computed `heatmap_cache.json` if present (fast path for demo)

**`backend/firestore_client.py`** — Dual-mode cache.

- `USE_FIRESTORE=false` → in-memory dict (local dev, resets on restart)
- `USE_FIRESTORE=true` → Firestore Native mode (prod); forecast TTL 6 hours, observations by H3 cell

**`backend/models.py`** — Pydantic models: `SpeciesForecast`, `DailyForecast`, `ForecastResponse`, `PhotoClassifyResponse`, `HeatmapCell`.

**`backend/config.py`** — Env vars, 15 allergen species list with taxon IDs / allergenicity / Google codes, `GOOGLE_TO_INAT_MAP`.

---

### Data

| File | Contents |
|---|---|
| `backend/data/phenology_base.json` | 15 species × 5 latitude bands — `onset_doy`, `peak_doy`, `duration`. 47/75 entries from real iNat historical obs (2018–2026); remainder are USDA/NPN fallbacks |
| `backend/data/allergen_species.json` | Species whitelist with metadata |
| `backend/data/advisory_kb.json` | Approved prevention measures per species / severity used to ground Gemini advisory output |

---

### Scripts

| Script | Purpose |
|---|---|
| `scripts/fetch_phenology_from_inat.py` | Fetch real historical flowering data from iNat and rebuild `phenology_base.json` |
| `scripts/build_phenology_table.py` | Build phenology table from a GBIF CSV export |
| `scripts/seed_firestore.py` | Seed synthetic San Diego observations for local testing |
| `scripts/generate_heatmap.py` | Pre-compute `heatmap_cache.json` for a demo location |

---

### Tests

```
backend/tests/
├── test_phenology.py        # 12 unit tests — bloom curve, lat bands, stage transitions
├── test_fusion.py           # 11 unit tests — pollen index blending, seasonal shift, 14-day output
├── test_inat_client.py      # iNat parser + bbox + merge logic
├── test_google_pollen_client.py
└── test_gemini_agents.py
```

Run: `cd backend && pytest tests/ -v`

---

## Architecture

```
User request
    │
    ▼
GET /api/forecast (main.py · build_forecast_response)
    │
    ├── Firestore/in-memory cache (6h TTL) ──hit──► return cached
    │
    ├── iNat observations  (local H3 ring, last 7 days)
    │
    ├── Google Pollen API  (5-day UPI per plant/type)
    │
    ├── phenology_engine.generate_14day_forecast()
    │       └── per species: _get_base_phenology → _compute_stage → _compute_pollen_index
    │                        seasonal shift from iNat obs
    │                        Google UPI blend on days 0–4
    │
    ├── Gemini 2.5 Flash   (narrative + advisory, single call)
    │
    └── save to cache ──► ForecastResponse (14 × DailyForecast × top-5 SpeciesForecast)
```

Key code relationships from the knowledge graph:
- `build_forecast_response()` is the central bridge (11 edges) connecting the Firestore cache, iNat, Google Pollen, phenology engine, and Gemini layers
- `_compute_stage()` (10 edges) and `compute_day_forecast()` (9 edges) are the inner forecasting core
- `fetch_inat_delta()` (7 edges) bridges live observation ingestion to both the forecast pipeline and the ingest endpoint

---

## Setup

### Prerequisites

- Python 3.11+
- GCP project with Pollen API, Vertex AI / Generative Language API enabled
- (Optional) Firestore database in Native mode

### Environment

Copy `.env.example` to `.env` and fill in:

```env
GOOGLE_POLLEN_API_KEY=your-key-here
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash          # optional override
GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json
GCP_PROJECT_ID=your-project-id
INAT_APP_ID=your-inat-app-id           # optional, raises rate limit
USE_FIRESTORE=false                    # set true for persistence
```

### Run locally

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Must run from `backend/` — all module imports are relative to that directory.

### Docker

```bash
docker-compose up --build
# backend available at http://localhost:8000
```

### Pre-compute heatmap (demo)

```bash
python scripts/generate_heatmap.py 32.71 -117.16 5
```

### Ingest iNat observations (San Diego)

```bash
curl -X POST http://localhost:8000/api/ingest/delta \
  -H "Content-Type: application/json" \
  -d '{"regions":[{"name":"san_diego","swlat":32.5,"swlng":-117.3,"nelat":33.1,"nelng":-116.9}]}'
```

---

## Stack

| Layer | Tech |
|---|---|
| API | FastAPI 0.115, Uvicorn |
| Spatial indexing | H3 resolution 4 (~22 km hexagons) |
| Pollen data | Google Pollen API (`forecast:lookup`) |
| Citizen science | iNaturalist API v1 (research-grade obs) |
| LLM | Gemini 2.5 Flash (REST JSON mode) |
| Cache / DB | Firestore Native or in-memory dict |
| Container | Docker → Cloud Run |
| Deps | Pydantic v2, httpx, python-dotenv, google-cloud-firestore |
