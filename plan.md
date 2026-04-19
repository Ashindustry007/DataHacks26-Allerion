# PollenCast — 24-Hour Hackathon Build Plan

## Project summary

**What we're building:** A localized, species-specific pollen forecasting system that fuses iNaturalist citizen-science observations with Google's Pollen API to give allergy sufferers personalized 7-day and 14-day pollen risk forecasts, a live heatmap, and AI-generated prevention guidance.

**What makes it different:** Existing pollen apps (Google, Pollen.com, Weather.com) tell you "tree pollen is high." We tell you "*red oak* pollen peaks *Thursday* in *your neighborhood*, based on 12 observations this week — here's what to do." Species-level, neighborhood-level, observation-grounded.

**Stack:** Python (FastAPI) backend, React frontend, Google Cloud (Pollen API, Gemini, Cloud Run, Firestore, Cloud Storage). Developed locally first, deployed to GCP when working.

---

## Team roles

| Person | Role | Owns | Depends on |
|--------|------|------|------------|
| **Person A** | Backend core | FastAPI server, phenology engine, fusion logic, API endpoints, Firestore integration | Nothing — starts first |
| **Person B** | Integrations & agents | iNat delta fetcher, Google Pollen API client, Gemini agents (narrator, advisory, classifier), photo upload flow | Person A's data models (shared by hour 2) |
| **Person C** | Frontend | React SPA, 14-day forecast timeline, heatmap (Leaflet + H3), photo upload UI, alert dashboard | Person A's API contract (shared by hour 2) |

**Critical coordination points:**
- Hour 0: Everyone reads this doc, sets up local env
- Hour 2: Person A shares data models + API contract JSON. All three work independently after this
- Hour 10: Integration checkpoint — Person B's agents plugged into Person A's endpoints
- Hour 16: Frontend connects to backend — first full demo run
- Hour 20: Feature freeze. Polish only after this

---

## Local development setup (everyone does this in hour 0)

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for final GCP push)
- Google Cloud account with billing enabled ($300 free credit for new accounts)

### GCP API keys (one person sets up, shares with team)

```bash
# 1. Create a GCP project
gcloud projects create pollencast-hack --name="PollenCast"
gcloud config set project pollencast-hack

# 2. Enable APIs
gcloud services enable \
  pollen.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com

# 3. Create Firestore database (Native mode)
gcloud firestore databases create --location=us-central1

# 4. Create API key for Google Pollen API
# Go to: console.cloud.google.com/apis/credentials
# Create API Key → restrict to Pollen API
# Save as GOOGLE_POLLEN_API_KEY

# 5. Generate Gemini API key
# Go to: aistudio.google.com/apikey
# Save as GEMINI_API_KEY

# 6. Create service account for local Firestore access
gcloud iam service-accounts create pollencast-dev
gcloud projects add-iam-policy-binding pollencast-hack \
  --member="serviceAccount:pollencast-dev@pollencast-hack.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
gcloud iam service-accounts keys create ./gcp-key.json \
  --iam-account=pollencast-dev@pollencast-hack.iam.gserviceaccount.com
```

### Shared `.env` file (everyone copies this)

```env
GOOGLE_POLLEN_API_KEY=your-key-here
GEMINI_API_KEY=your-key-here
GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json
GCP_PROJECT_ID=pollencast-hack
INAT_APP_ID=your-inat-app-id  # optional, increases rate limit
```

### Repository structure

```
pollencast/
├── backend/
│   ├── main.py                    # FastAPI app entry point (Person A)
│   ├── requirements.txt
│   ├── models.py                  # Pydantic data models (Person A, shared hour 2)
│   ├── config.py                  # Env vars + constants (Person A)
│   ├── phenology_engine.py        # Base table + fusion logic (Person A)
│   ├── inat_client.py             # iNat API delta fetcher (Person B)
│   ├── google_pollen_client.py    # Google Pollen API client (Person B)
│   ├── gemini_agents.py           # All 3 LLM agents (Person B)
│   ├── photo_classifier.py       # User photo → species + stage (Person B)
│   ├── firestore_client.py        # DB read/write helpers (Person A)
│   ├── heatmap_generator.py       # Pre-compute heatmap GeoJSON (Person A)
│   ├── data/
│   │   ├── phenology_base.json    # Pre-computed lookup table (Person A builds)
│   │   ├── allergen_species.json  # Species whitelist with metadata
│   │   └── advisory_kb.json       # Prevention measures knowledge base (Person B)
│   ├── Dockerfile
│   └── tests/
│       ├── test_phenology.py
│       └── test_fusion.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Root + routing (Person C)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Main forecast view (Person C)
│   │   │   ├── Heatmap.jsx        # Full-screen map (Person C)
│   │   │   └── PhotoUpload.jsx    # Camera + results (Person C)
│   │   ├── components/
│   │   │   ├── ForecastTimeline.jsx
│   │   │   ├── SpeciesCard.jsx
│   │   │   ├── PollenIndex.jsx
│   │   │   ├── AdvisoryPanel.jsx
│   │   │   └── HexGrid.jsx
│   │   └── api/
│   │       └── client.js          # API client functions
│   ├── package.json
│   └── vite.config.js
├── scripts/
│   ├── build_phenology_table.py   # One-time data prep (Person A)
│   ├── seed_firestore.py          # Load test data (Person A)
│   └── generate_heatmap.py        # Pre-compute heatmap tiles (Person A)
├── .env
├── docker-compose.yml
└── README.md
```

### Local run commands

```bash
# Terminal 1: Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev  # runs on port 5173

# Frontend proxies API calls to localhost:8000
```

---

## Shared data contracts (Person A writes by hour 2, everyone uses)

### `models.py` — the single source of truth

```python
from pydantic import BaseModel
from datetime import date
from typing import Optional

class SpeciesForecast(BaseModel):
    species_id: int
    name: str
    pollen_type: str               # "tree" | "grass" | "weed"
    current_stage: str             # DORMANT | BUDDING | EARLY_BLOOM | PEAK_BLOOM | LATE_BLOOM | POST_BLOOM
    pollen_prob: float             # 0.0 - 1.0
    pollen_index: float            # 0.0 - 5.0
    days_to_peak: int
    peak_date_est: Optional[str]
    confidence: float              # 0.0 - 1.0
    sources: list[str]             # ["inat", "google", "base"]
    seasonal_shift_days: int
    inat_obs_count: int
    google_upi: Optional[int]

class DailyForecast(BaseModel):
    date: str
    day_offset: int                # 0 = today, 13 = day 14
    confidence_tier: str           # "high" (days 0-4) | "estimated" (5-13)
    composite_index: float         # 0.0 - 5.0
    severity: str                  # "low" | "moderate" | "high" | "very_high"
    top_species: list[SpeciesForecast]

class ForecastResponse(BaseModel):
    location: dict                 # { lat, lng, h3_cell, city }
    generated_at: str
    daily: list[DailyForecast]     # 14 items
    narrative: dict                # { headline, today_summary, seven_day, fourteen_day }
    advisory: dict                 # { general_measures, species_tips, timing_advice }

class PhotoClassifyResponse(BaseModel):
    species_id: Optional[int]
    species_name: str
    is_allergen: bool
    phenology_stage: str
    pollen_releasing: bool
    confidence: float
    explanation: str               # LLM-generated species explainer
    action: str                    # "what to do right now"
    local_forecast: Optional[ForecastResponse]  # forecast for this location

class HeatmapCell(BaseModel):
    h3_cell: str
    lat: float
    lng: float
    composite_index: float
    severity: str
    top_species_name: str
    top_species_prob: float
```

### API contract (Person C: build against this)

```
GET  /api/forecast?lat=32.71&lng=-117.16
     → ForecastResponse

POST /api/photo
     Body: { "image_base64": "...", "lat": 32.71, "lng": -117.16 }
     → PhotoClassifyResponse

GET  /api/heatmap?lat=32.71&lng=-117.16&radius_km=30
     → GeoJSON FeatureCollection of HeatmapCells

GET  /api/species
     → list of { species_id, name, pollen_type, allergenicity }

POST /api/ingest/delta   (internal, called by scheduler)
     Body: { "regions": [{ "name": "...", "swlat": ..., ... }] }
     → { "status": "ok", "observations_ingested": 42 }
```

**Person C: use this mock data until backend is ready:**

```javascript
// api/client.js — mock mode for independent frontend dev
const MOCK = true;

export async function getForecast(lat, lng) {
  if (MOCK) return {
    location: { lat, lng, h3_cell: "842a100ffffffff", city: "San Diego" },
    generated_at: new Date().toISOString(),
    daily: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0],
      day_offset: i,
      confidence_tier: i < 5 ? "high" : "estimated",
      composite_index: Math.round((2.5 + Math.sin(i / 3) * 1.5) * 10) / 10,
      severity: ["low", "moderate", "high", "moderate"][i % 4],
      top_species: [
        { species_id: 56928, name: "White oak", pollen_type: "tree",
          current_stage: "PEAK_BLOOM", pollen_prob: 0.82, pollen_index: 4.1,
          days_to_peak: 0, confidence: 0.85, sources: ["inat", "google", "base"],
          inat_obs_count: 12, google_upi: 4, seasonal_shift_days: -8 },
        { species_id: 48678, name: "Common ragweed", pollen_type: "weed",
          current_stage: "DORMANT", pollen_prob: 0.0, pollen_index: 0,
          days_to_peak: 119, confidence: 0.9, sources: ["base"],
          inat_obs_count: 0, google_upi: 0, seasonal_shift_days: 0 },
      ],
    })),
    narrative: {
      headline: "Oak pollen peaks this weekend",
      today_summary: "Tree pollen is high in your area today, driven primarily by white oak...",
      seven_day: "Oak pollen will remain elevated through Thursday before declining...",
      fourteen_day: "Grass season begins in approximately 3 weeks..."
    },
    advisory: {
      general_measures: [
        "Keep windows closed during morning hours (5-10 AM)",
        "Shower and change clothes after outdoor activity",
      ],
      species_tips: ["Oak pollen is heavy — visible yellow dust on cars is a sign of high levels"],
      timing_advice: "Best outdoor time today: after 4 PM when pollen counts typically drop"
    }
  };
  // Real API call when backend is ready
  const resp = await fetch(`/api/forecast?lat=${lat}&lng=${lng}`);
  return resp.json();
}
```

---

## Person A: Backend core (hours 0–20)

### Hour 0–2: Project scaffold + data models

1. Create the repo structure above
2. Write `requirements.txt`:
   ```
   fastapi==0.115.0
   uvicorn[standard]==0.32.0
   httpx==0.27.0
   h3==4.1.0
   google-cloud-firestore==2.19.0
   python-dotenv==1.0.1
   pydantic==2.10.0
   python-multipart==0.0.12
   ```
3. Write `models.py` (the shared contract above) — **share with team immediately**
4. Write `config.py`:
   ```python
   import os
   from dotenv import load_dotenv
   load_dotenv()

   GOOGLE_POLLEN_API_KEY = os.getenv("GOOGLE_POLLEN_API_KEY")
   GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
   GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")

   # H3 resolution 4 = ~22km hexagons (good for metro-level)
   H3_RESOLUTION = 4

   # Species whitelist with iNat taxon IDs
   ALLERGEN_SPECIES = [
       {"taxon_id": 48678, "name": "Common ragweed", "pollen_type": "weed",
        "allergenicity": 5, "google_code": "RAGWEED"},
       {"taxon_id": 56928, "name": "White oak", "pollen_type": "tree",
        "allergenicity": 4, "google_code": "OAK"},
       {"taxon_id": 48734, "name": "Paper birch", "pollen_type": "tree",
        "allergenicity": 4, "google_code": "BIRCH"},
       {"taxon_id": 49085, "name": "Eastern red cedar", "pollen_type": "tree",
        "allergenicity": 3, "google_code": "JUNIPER"},
       {"taxon_id": 64727, "name": "Timothy grass", "pollen_type": "grass",
        "allergenicity": 4, "google_code": "GRAMINALES"},
       {"taxon_id": 49095, "name": "White ash", "pollen_type": "tree",
        "allergenicity": 3, "google_code": "ASH"},
       {"taxon_id": 54772, "name": "American elm", "pollen_type": "tree",
        "allergenicity": 3, "google_code": "ELM"},
       {"taxon_id": 53548, "name": "Eastern cottonwood", "pollen_type": "tree",
        "allergenicity": 2, "google_code": "COTTONWOOD"},
       {"taxon_id": 52823, "name": "Olive", "pollen_type": "tree",
        "allergenicity": 4, "google_code": "OLIVE"},
       {"taxon_id": 52853, "name": "Common mugwort", "pollen_type": "weed",
        "allergenicity": 3, "google_code": "MUGWORT"},
       {"taxon_id": 48513, "name": "Red alder", "pollen_type": "tree",
        "allergenicity": 3, "google_code": "ALDER"},
       {"taxon_id": 64698, "name": "Kentucky bluegrass", "pollen_type": "grass",
        "allergenicity": 4, "google_code": "GRAMINALES"},
       {"taxon_id": 56891, "name": "Northern red oak", "pollen_type": "tree",
        "allergenicity": 4, "google_code": "OAK"},
       {"taxon_id": 56610, "name": "Giant ragweed", "pollen_type": "weed",
        "allergenicity": 5, "google_code": "RAGWEED"},
       {"taxon_id": 47602, "name": "Perennial ryegrass", "pollen_type": "grass",
        "allergenicity": 4, "google_code": "GRAMINALES"},
   ]
   ```
5. Write skeleton `main.py` with all endpoints returning mock data. Push. Tell Person C "API contract is live, mock mode."

### Hour 2–6: Phenology engine + fusion logic

Build `phenology_engine.py`. This is your core — the thing that answers "what is species X doing on day Y at latitude Z?"

**Build the base phenology table.** Run `scripts/build_phenology_table.py` which:
1. Loads the pre-downloaded iNat GBIF CSV (filtered to your 15 species, North America, 2019-2025, with phenology annotations)
2. For each species × 5° latitude band, computes median onset day-of-year, median peak day-of-year, and season duration from the "Flowering" annotations
3. Saves as `data/phenology_base.json`

If you don't have time for the GBIF download, **hardcode the table** using published phenology data from the USDA/NPN. For example:

```json
{
  "48678": {
    "name": "Common ragweed",
    "lat_bands": {
      "25-30": {"onset_doy": 200, "peak_doy": 235, "duration": 50},
      "30-35": {"onset_doy": 210, "peak_doy": 245, "duration": 45},
      "35-40": {"onset_doy": 220, "peak_doy": 255, "duration": 40},
      "40-45": {"onset_doy": 225, "peak_doy": 260, "duration": 35},
      "45-50": {"onset_doy": 230, "peak_doy": 263, "duration": 30}
    }
  },
  "56928": {
    "name": "White oak",
    "lat_bands": {
      "25-30": {"onset_doy": 60, "peak_doy": 85, "duration": 35},
      "30-35": {"onset_doy": 75, "peak_doy": 100, "duration": 30},
      "35-40": {"onset_doy": 90, "peak_doy": 115, "duration": 28},
      "40-45": {"onset_doy": 105, "peak_doy": 130, "duration": 25},
      "45-50": {"onset_doy": 120, "peak_doy": 142, "duration": 22}
    }
  }
}
```

Build the fusion function (see previous conversation for the full `fuse_pollen_forecast` code). Test it standalone with hardcoded inputs before wiring to APIs.

### Hour 6–8: Firestore integration + caching

Build `firestore_client.py`:
- `save_forecast(h3_cell, forecast_data)` — writes to `forecasts/{h3_cell}`
- `get_cached_forecast(h3_cell)` — reads, returns None if >6 hours old
- `save_observations(observations_list)` — batch write to `observations` collection
- `get_recent_observations(h3_cells, since_hours=168)` — reads last 7 days of obs for given cells

**For local dev without Firestore:** Person A should build a `LocalCache` class that uses a simple dict in memory. Swap to Firestore when deploying. This lets you work offline.

```python
# firestore_client.py
import os
from datetime import datetime, timedelta

USE_FIRESTORE = os.getenv("USE_FIRESTORE", "false").lower() == "true"

if USE_FIRESTORE:
    from google.cloud import firestore
    db = firestore.Client()
else:
    db = None
    _local_cache = {}

def save_forecast(h3_cell: str, data: dict):
    data["cached_at"] = datetime.utcnow().isoformat()
    if USE_FIRESTORE:
        db.collection("forecasts").document(h3_cell).set(data)
    else:
        _local_cache[f"forecast:{h3_cell}"] = data

def get_cached_forecast(h3_cell: str, max_age_hours: int = 6):
    if USE_FIRESTORE:
        doc = db.collection("forecasts").document(h3_cell).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
    else:
        data = _local_cache.get(f"forecast:{h3_cell}")
    if not data:
        return None
    cached_at = datetime.fromisoformat(data["cached_at"])
    if datetime.utcnow() - cached_at > timedelta(hours=max_age_hours):
        return None
    return data
```

### Hour 8–10: Wire endpoints to real logic

Replace all mock responses in `main.py` with actual calls to the phenology engine, fusion logic, and (when Person B is ready) the integration clients.

```python
@app.get("/api/forecast")
async def get_forecast(lat: float, lng: float):
    h3_cell = h3.latlng_to_cell(lat, lng, H3_RESOLUTION)

    # Check cache
    cached = get_cached_forecast(h3_cell)
    if cached:
        return cached

    # Get neighboring cells for spatial context
    neighbors = list(h3.grid_disk(h3_cell, 1))

    # Fetch data (Person B's clients)
    google_data = await google_pollen_client.fetch(lat, lng)
    inat_obs = get_recent_observations(neighbors)

    # Run fusion for 14 days
    daily = phenology_engine.generate_14day_forecast(
        lat, lng, h3_cell, neighbors, google_data, inat_obs
    )

    # Generate narrative + advisory (Person B's agents)
    narrative = await gemini_agents.generate_narrative(daily, lat, lng)
    advisory = await gemini_agents.generate_advisory(daily)

    response = {
        "location": {"lat": lat, "lng": lng, "h3_cell": h3_cell},
        "generated_at": datetime.utcnow().isoformat(),
        "daily": daily,
        "narrative": narrative,
        "advisory": advisory,
    }

    save_forecast(h3_cell, response)
    return response
```

### Hour 10–14: Heatmap generation

Build `heatmap_generator.py`. Pre-computes a GeoJSON FeatureCollection for all H3 cells within a radius of the demo location.

```python
import h3
import json
from phenology_engine import compute_day_forecast

def generate_heatmap(center_lat, center_lng, radius_rings=5):
    """Generate heatmap GeoJSON for H3 cells around a center point."""
    center_cell = h3.latlng_to_cell(center_lat, center_lng, 4)
    cells = h3.grid_disk(center_cell, radius_rings)

    features = []
    for cell in cells:
        lat, lng = h3.cell_to_latlng(cell)
        boundary = h3.cell_to_boundary(cell)
        # h3 returns (lat,lng) pairs, GeoJSON needs [lng,lat]
        coords = [[p[1], p[0]] for p in boundary]
        coords.append(coords[0])  # close the polygon

        forecast = compute_day_forecast(lat, lng, day_offset=0)

        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {
                "h3_cell": cell,
                "lat": round(lat, 4),
                "lng": round(lng, 4),
                "composite_index": forecast["composite_index"],
                "severity": forecast["severity"],
                "top_species_name": forecast["top_species"][0]["name"]
                    if forecast["top_species"] else "None",
                "top_species_prob": forecast["top_species"][0]["pollen_prob"]
                    if forecast["top_species"] else 0,
            }
        })

    return {"type": "FeatureCollection", "features": features}
```

Run this once, save the output as `data/heatmap_san_diego.json`. Serve it from the `/api/heatmap` endpoint. Don't recompute per request.

### Hour 14–18: Integration with Person B's work

Person B should have the iNat client, Google Pollen client, and Gemini agents ready. Plug them in:
- Replace hardcoded Google Pollen data with real API calls
- Replace hardcoded iNat observations with real delta data
- Replace hardcoded narratives with Gemini-generated ones

### Hour 18–20: Testing + bug fixes

Run the full flow end-to-end for San Diego. Fix the things that will break:
- Gemini returning malformed JSON (add JSON repair + retry)
- H3 cell edge cases at coastlines (cells over water have no data)
- Google Pollen API returning empty `plantInfo` for some days
- Cache invalidation not working properly

---

## Person B: Integrations & agents (hours 0–18)

### Hour 0–2: Setup + read Person A's data models

1. Set up local env per instructions above
2. Read `models.py` when Person A shares it
3. Create skeleton files: `inat_client.py`, `google_pollen_client.py`, `gemini_agents.py`, `photo_classifier.py`
4. Get API keys tested — make one raw curl call to each API to confirm they work

```bash
# Test Google Pollen API
curl "https://pollen.googleapis.com/v1/forecast:lookup?key=$GOOGLE_POLLEN_API_KEY&location.latitude=32.71&location.longitude=-117.16&days=1"

# Test iNat API
curl "https://api.inaturalist.org/v1/observations?taxon_id=56928&quality_grade=research&d1=2026-04-01&nelat=33.1&nelng=-116.8&swlat=32.5&swlng=-117.5&term_id=12&term_value_id=13&per_page=5"

# Test Gemini
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Say hello in JSON: {\"message\":\"...\"}"}]}]}'
```

### Hour 2–6: iNat daily delta client

Build `inat_client.py`. The exact API call:

```
GET https://api.inaturalist.org/v1/observations
  ?taxon_id={species_taxon_id}
  &quality_grade=research
  &d1={7_days_ago}
  &swlat={bbox_south}
  &swlng={bbox_west}
  &nelat={bbox_north}
  &nelng={bbox_east}
  &term_id=12
  &term_value_id=13
  &per_page=200
  &order_by=observed_on
  &order=desc
```

Parameters explained:
- `term_id=12` = Plant Phenology annotation
- `term_value_id=13` = Flowering (also query `15` = Flower Budding separately)
- `d1` = observed on or after this date
- Bounding box: `swlat/swlng/nelat/nelng`
- `quality_grade=research` = community-verified IDs only

**Rate limit: 1 request per second, 10,000 per day.** With 15 species × 3 queries each (flowering + budding + all) = 45 requests per region. Runs in ~45 seconds.

Build the full fetcher function (see the `fetch_inat_delta` code from the previous conversation). Make sure to:
1. Deduplicate observations across the flowering/budding/all queries
2. Extract phenology annotation from `obs["annotations"]` array
3. Compute H3 cell for each observation
4. Handle paginated results (if `total_results > per_page`, use `id_above` parameter)
5. Sleep 1 second between requests

**For unannotated observations:** Infer stage from date vs. base phenology table. Don't call Gemini for bulk inference during the hackathon — save LLM budget for user-facing features.

Test standalone:
```bash
python -c "
import asyncio
from inat_client import fetch_inat_delta
bbox = {'swlat': 32.5, 'swlng': -117.5, 'nelat': 33.1, 'nelng': -116.8}
obs = asyncio.run(fetch_inat_delta(bbox, since_days=30))
print(f'Fetched {len(obs)} observations')
for o in obs[:5]:
    print(f'  {o[\"species_name\"]} - {o[\"phenology_stage\"]} - {o[\"observed_on\"]}')
"
```

### Hour 6–10: Google Pollen API client

Build `google_pollen_client.py`. The exact API call:

```
GET https://pollen.googleapis.com/v1/forecast:lookup
  ?key={API_KEY}
  &location.latitude={lat}
  &location.longitude={lng}
  &days=5
  &plantsDescription=0
  &languageCode=en
```

Response structure you care about:
```
dailyInfo[].pollenTypeInfo[] → TREE/GRASS/WEED UPI (0-5)
dailyInfo[].plantInfo[]      → per-genus UPI (OAK, BIRCH, RAGWEED, etc.)
```

Build the mapping function that converts Google plant codes to your iNat taxon IDs (see `GOOGLE_TO_INAT_MAP` from the previous conversation).

**Key implementation detail:** Google provides UPI for only 5 days. For days 6-14, return `None` so the fusion engine knows to rely on the base table only. Handle this cleanly:

```python
async def fetch_google_pollen(lat: float, lng: float) -> list[dict | None]:
    """Returns list of 14 items. Items 0-4 have Google data, 5-13 are None."""
    raw = await _call_google_api(lat, lng)  # 5 days
    padded = raw + [None] * 9               # pad to 14
    return padded
```

Test standalone:
```bash
python -c "
import asyncio
from google_pollen_client import fetch_google_pollen
data = asyncio.run(fetch_google_pollen(32.71, -117.16))
for d in data[:5]:
    print(f'{d[\"date\"]}: TREE={d[\"types\"].get(\"TREE\",{}).get(\"upi\",\"?\")} '
          f'GRASS={d[\"types\"].get(\"GRASS\",{}).get(\"upi\",\"?\")}')
"
```

### Hour 10–14: Gemini agents

Build `gemini_agents.py`. Three agents, one file. Use the Gemini REST API directly (no SDK needed — keeps dependencies minimal).

```python
import httpx, json, os

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
API_KEY = os.getenv("GEMINI_API_KEY")

async def _call_gemini(system_prompt: str, user_content: str) -> dict:
    """Call Gemini Flash and parse JSON response."""
    payload = {
        "contents": [{"parts": [{"text": user_content}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.3,
        }
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{GEMINI_URL}?key={API_KEY}", json=payload)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]

        # JSON repair: strip markdown fences if present
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
```

**Agent 1: Forecast narrator.** System prompt + structured data in → headline + summaries out. See the full prompt from the previous conversation.

**Agent 2: Advisory agent.** System prompt with the hardcoded approved measures list + forecast data in → prevention recommendations out. See the full prompt from the previous conversation. Put the approved measures in `data/advisory_kb.json` and load them into the system prompt.

**Agent 3: Species explainer** (used for photo uploads). Takes species + stage + pollen_releasing flag and returns a 3-4 sentence explanation.

**Optimization: batch agents 1 + 2 into a single Gemini call.** This saves 2-3 seconds of latency per request:

```python
async def generate_forecast_and_advisory(daily_forecasts: list, lat: float, lng: float) -> dict:
    """Single Gemini call that returns both narrative and advisory."""
    system = """You generate pollen forecast narratives AND prevention advice.
    Return JSON with two keys: "narrative" and "advisory".
    [full prompt details here]"""

    user_data = json.dumps({
        "location": {"lat": lat, "lng": lng},
        "today": daily_forecasts[0],
        "seven_day": daily_forecasts[:7],
        "fourteen_day": daily_forecasts,
    })

    return await _call_gemini(system, user_data)
```

Test each agent standalone with sample data before integrating.

### Hour 14–16: Photo classifier

Build `photo_classifier.py`. This uses Gemini's vision capability. The exact API call with an image:

```python
async def classify_photo(image_base64: str, lat: float, lng: float) -> dict:
    """Classify a user photo: species ID + phenology stage."""
    from config import ALLERGEN_SPECIES

    species_list = ", ".join(
        f"{s['name']} (ID:{s['taxon_id']})" for s in ALLERGEN_SPECIES
    )

    system = f"""You are a plant identification and phenology expert.
    Identify the plant and classify its reproductive stage.

    ALLERGEN SPECIES TO CHECK AGAINST:
    {species_list}

    Return JSON:
    {{
      "species_id": int or null,
      "species_name": "common name",
      "is_allergen": true/false,
      "phenology_stage": "DORMANT|BUDDING|EARLY_BLOOM|PEAK_BLOOM|LATE_BLOOM|POST_BLOOM",
      "pollen_releasing": true/false,
      "confidence": 0.0-1.0,
      "reasoning": "one sentence"
    }}"""

    payload = {
        "contents": [{
            "parts": [
                {"text": f"Identify this plant and its phenology stage. Location: lat {lat}, lng {lng}"},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}}
            ]
        }],
        "systemInstruction": {"parts": [{"text": system}]},
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{GEMINI_URL}?key={API_KEY}", json=payload)
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
```

### Hour 16–18: Integration with Person A's backend

Plug all clients and agents into Person A's endpoints. The main integration points:
- `google_pollen_client.fetch()` called inside `/api/forecast`
- `inat_client.fetch_inat_delta()` called by `/api/ingest/delta`
- `gemini_agents.generate_forecast_and_advisory()` called inside `/api/forecast`
- `photo_classifier.classify_photo()` called inside `/api/photo`

Test the full flow: forecast request → Google data fetched → iNat data fetched → fusion computed → Gemini narrative generated → response returned.

---

## Person C: Frontend (hours 0–20)

### Hour 0–2: Setup + scaffold

1. Create React app with Vite:
   ```bash
   npm create vite@latest frontend -- --template react
   cd frontend
   npm install leaflet react-leaflet h3-js recharts
   ```
2. Set up the API client with mock mode (see mock data above)
3. Set up Vite proxy to backend:
   ```javascript
   // vite.config.js
   export default defineConfig({
     plugins: [react()],
     server: {
       proxy: {
         '/api': 'http://localhost:8000'
       }
     }
   })
   ```
4. Create all page + component files as empty shells
5. Build and run — confirm you can render a blank page with mock data

### Hour 2–8: Dashboard page (the main view)

This is the money page. Build these components:

**PollenIndex** — large circular gauge showing today's composite index (0-5) with severity color. Occupies the top of the page. Color scheme: green (0-1), yellow (2), orange (3), red (4), dark red (5).

**ForecastTimeline** — horizontal bar chart showing 14 days. Use Recharts `BarChart`. Each bar colored by severity. X-axis = day labels ("Mon", "Tue", etc.). Y-axis = composite index 0-5. A vertical dotted line separates "high confidence" (days 1-5, backed by Google data) from "estimated" (days 6-14). Clicking a bar shows that day's species breakdown.

**SpeciesCard** — one card per top species. Shows: species name, pollen type badge (tree/grass/weed), current stage as a progress bar (DORMANT → BUDDING → EARLY → PEAK → LATE → POST), days to peak, confidence indicator, and the observation count ("based on 12 local observations"). Sort by pollen_prob descending.

**AdvisoryPanel** — collapsible panel at the bottom showing the LLM-generated prevention measures. General measures as a list, species-specific tips in callout boxes, timing advice as a highlighted quote.

**NarrativeHeader** — the headline + today_summary from the narrator agent, displayed as a card above the timeline.

### Hour 8–14: Heatmap page

Full-screen Leaflet map with H3 hexagon overlay.

```jsx
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import h3 from 'h3-js';

const COLORS = {
  0: '#4ade80', 1: '#a3e635', 2: '#facc15',
  3: '#fb923c', 4: '#f87171', 5: '#dc2626'
};

function Heatmap() {
  const [geojson, setGeojson] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState('all');

  useEffect(() => {
    fetch('/api/heatmap?lat=32.71&lng=-117.16&radius_km=30')
      .then(r => r.json())
      .then(setGeojson);
  }, []);

  const style = (feature) => ({
    fillColor: COLORS[Math.round(feature.properties.composite_index)],
    fillOpacity: 0.55,
    weight: 0.5,
    color: '#888',
  });

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    layer.bindPopup(`
      <strong>Pollen index: ${p.composite_index}/5</strong><br/>
      Severity: ${p.severity}<br/>
      Top: ${p.top_species_name} (${Math.round(p.top_species_prob * 100)}%)
    `);
  };

  return (
    <MapContainer center={[32.71, -117.16]} zoom={10} style={{height: '100vh'}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {geojson && <GeoJSON data={geojson} style={style} onEachFeature={onEachFeature} />}
      {/* Species filter dropdown - floating panel top-right */}
    </MapContainer>
  );
}
```

Add a floating panel with a species dropdown that filters the heatmap by species. When "all" is selected, show composite index. When a specific species is selected, re-color hexagons by that species' pollen_prob.

### Hour 14–18: Photo upload page

Camera/file upload → loading spinner → results card.

```jsx
function PhotoUpload() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(file) {
    setLoading(true);
    const base64 = await fileToBase64(file);
    const resp = await fetch('/api/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: base64,
        lat: userLat,
        lng: userLng,
      }),
    });
    setResult(await resp.json());
    setLoading(false);
  }

  return (
    <div>
      <input type="file" accept="image/*" capture="environment"
             onChange={e => handleUpload(e.target.files[0])} />
      {loading && <Spinner message="Identifying plant..." />}
      {result && <ClassificationResult data={result} />}
    </div>
  );
}
```

The `ClassificationResult` component shows:
- Photo thumbnail
- Species name + confidence badge
- Phenology stage indicator (same progress bar as SpeciesCard)
- "Pollen releasing: YES/NO" with color coding
- The species explainer text from the LLM
- "What to do" action card
- Full forecast for this location (reuse Dashboard components)

### Hour 18–20: Polish + mobile responsiveness

- Geolocation permission prompt on first visit
- Loading states for all API calls
- Error handling (API down, location denied, photo too large)
- Mobile-first CSS (the demo will likely be on a phone)
- Navigation: bottom tab bar with three tabs (Dashboard / Map / Camera)
- Smooth transitions between pages

---

## Integration timeline

```
Hour 0-2:   Everyone sets up. Person A writes + shares data models.
            Person C starts building with mock data immediately.
            Person B tests API keys.

Hour 2-10:  INDEPENDENT WORK. No coordination needed.
            A: phenology engine + Firestore + endpoints
            B: iNat client + Google client + Gemini agents
            C: Dashboard + Timeline + SpeciesCards

Hour 10:    CHECKPOINT. 15-minute call.
            B plugs agents into A's endpoints. Quick test.
            C reports frontend status. Shares screenshots.

Hour 10-16: INDEPENDENT WORK continues.
            A: heatmap generation + bug fixes
            B: photo classifier + edge cases
            C: Heatmap page + Photo page

Hour 16:    INTEGRATION. Person C switches from mock to real API.
            Everyone in same room/call. Fix CORS, JSON parsing, etc.
            Target: first full demo run by hour 17.

Hour 18:    FEATURE FREEZE. No new features after this.

Hour 18-20: Everyone polishes their own section.
            A: Cache tuning, error handling, Dockerfile
            B: Prompt tuning (Gemini outputs), retry logic
            C: Mobile CSS, loading states, transitions

Hour 20-22: Deploy to GCP (see below). Test on real URL.

Hour 22-24: Demo prep. Write script. Practice twice.
```

---

## GCP deployment (hour 20-22)

### Backend → Cloud Run

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8080
ENV USE_FIRESTORE=true
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
```

```bash
cd backend
gcloud run deploy pollencast-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_POLLEN_API_KEY=$GOOGLE_POLLEN_API_KEY,GEMINI_API_KEY=$GEMINI_API_KEY,USE_FIRESTORE=true,GCP_PROJECT_ID=pollencast-hack" \
  --memory 512Mi \
  --timeout 60
```

Note the service URL output (e.g., `https://pollencast-api-xyz-uc.a.run.app`).

### Frontend → Cloud Storage

```bash
cd frontend

# Update API base URL to Cloud Run service
# In api/client.js, change base URL or use env var
echo "VITE_API_URL=https://pollencast-api-xyz-uc.a.run.app" > .env.production

npm run build

# Upload to GCS bucket configured as static website
gsutil mb gs://pollencast-frontend
gsutil web set -m index.html -e index.html gs://pollencast-frontend
gsutil -m cp -r dist/* gs://pollencast-frontend/
gsutil iam ch allUsers:objectViewer gs://pollencast-frontend
```

### Set up Cloud Scheduler (optional, for daily delta)

```bash
gcloud scheduler jobs create http inat-delta-job \
  --schedule="0 */6 * * *" \
  --uri="https://pollencast-api-xyz-uc.a.run.app/api/ingest/delta" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"regions":[{"name":"san_diego","swlat":32.5,"swlng":-117.5,"nelat":33.1,"nelng":-116.8}]}' \
  --location=us-central1
```

---

## Demo script (3 minutes)

**0:00–0:30 — The problem.**
"30% of Americans have seasonal allergies. Every pollen app tells you 'tree pollen is high today.' But WHICH tree? WHEN does it peak? And what should YOU do? That's what we built."

**0:30–1:15 — Dashboard demo.**
Open the app on phone. Show geolocation prompt. Dashboard loads: "Your pollen index is 3.2/5 — High." Show the 14-day timeline. "Oak pollen peaks Thursday. Ragweed is dormant until August. Grass starts in 3 weeks." Scroll to advisory: "Keep windows closed before 10 AM. Oak cross-reacts with apples."

**1:15–1:45 — Heatmap demo.**
Tap the Map tab. Show H3 hexagons around the city. "The inland valleys are worse than the coast right now because oak blooms earlier at lower elevations." Toggle species filter to Oak only — show the gradient.

**1:45–2:30 — Photo demo.**
Tap the Camera tab. Take a photo of a tree/flower (or use pre-loaded image). "Our system identified this as white oak in peak bloom — pollen is actively releasing. Here's what to do." Show the species explainer and the localized advisory.

**2:30–3:00 — How it works + differentiation.**
"We fuse two data sources: iNaturalist's 200 million citizen-science observations for species-level phenology timing, and Google's Pollen API for atmospheric readings. iNat tells us WHICH species and WHEN. Google tells us HOW MUCH right now. Together, they produce something neither can alone: species-specific, neighborhood-level, actionable pollen forecasts."

---

## Emergency fallbacks (if things break)

| What breaks | Fallback |
|-------------|----------|
| Google Pollen API quota exhausted | Return forecasts from base table only. Set `confidence_tier: "estimated"` for all 14 days |
| iNat API rate-limited | Use cached observations from last successful fetch. Show "data from 6 hours ago" in UI |
| Gemini API down/slow | Pre-generate 5 hardcoded narratives for common scenarios (low/moderate/high/very_high/oak_peak). Match by severity |
| Firestore unreachable | Fall back to in-memory cache (`USE_FIRESTORE=false`). State lost on restart but demo works |
| Photo classification fails | Return `{"species_name": "Unknown plant", "is_allergen": false}` with a message "Couldn't identify — try a closer photo" |
| Heatmap GeoJSON too slow | Pre-generate and serve as static file from GCS. No computation at request time |
| Frontend can't reach backend (CORS) | Add `CORSMiddleware` to FastAPI with `allow_origins=["*"]` |

---

## Cost estimate

| Service | Usage during hackathon | Cost |
|---------|----------------------|------|
| Cloud Run | ~100 requests during testing | $0 (free tier) |
| Firestore | <1000 reads/writes | $0 (free tier) |
| Cloud Storage | <100 MB | $0.02 |
| Google Pollen API | ~200 calls | $0 (free 5,000/month) |
| Gemini Flash API | ~300 calls × ~1000 tokens | ~$0.05 |
| iNat API | ~200 calls | Free |
| Cloud Scheduler | 1 job | $0 (free 3 jobs) |
| **Total** | | **< $1** |