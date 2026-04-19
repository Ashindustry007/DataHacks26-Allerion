# Person B — how to run tests and read the output

Person B owns the **iNaturalist client**, **Google Pollen API client**, **Gemini agents** (narrative + advisory + species explainer), and **photo classifier**, plus the small **`scripts/verify_person_b_apis.py`** connectivity checker.

This doc describes the **combined runner** and what a healthy run looks like.

## Prerequisites

- Python 3.11+ recommended (3.9+ usually works).
- From the repo folder **`datahacks_26/`**:
  ```bash
  python -m venv .venv
  source .venv/bin/activate   # Windows: .venv\Scripts\activate
  pip install -r backend/requirements.txt
  ```
- Copy **`.env.example`** to **`.env`** at `datahacks_26/.env` (or project root if you keep env there) and fill in keys for **network** sections:
  - `GOOGLE_POLLEN_API_KEY`
  - `GEMINI_API_KEY`
  - Optional: `INAT_APP_ID`

---

## Main script: `scripts/test_person_b.py`

Run from **`datahacks_26/`** (the directory that contains `backend/` and `scripts/`).

### Offline (no API keys, no network required)

```bash
python scripts/test_person_b.py --offline
```

**What runs**

1. **Pytest** — `test_inat_client.py`, `test_google_pollen_client.py`, and `test_gemini_agents.py` (parsing, UPI extraction, JSON helpers, Gemini response parsing).
2. **Import smoke** — Loads `gemini_agents`, `photo_classifier`, `inat_client`, `google_pollen_client` and confirms `backend/data/advisory_kb.json` loads via `gemini_agents`.

**What to look for**

- Pytest ends with **`passed`** (or a green summary) and exit code **0**.
- You should see: **`advisory_kb top-level keys:`** listing `general_measures`, `species_tips`, `timing_advice` (or similar).
- Final line: **`[OK] Offline run complete.`**

If pytest fails, read the failure name and file path — fix code or environment, then re-run.

---

### Default run (includes API connectivity)

```bash
python scripts/test_person_b.py
```

**Adds**

3. **`scripts/verify_person_b_apis.py`** — three HTTP checks:
   - Google Pollen `forecast:lookup` (needs `GOOGLE_POLLEN_API_KEY`)
   - iNaturalist sample observations (public; optional `INAT_APP_ID`)
   - Gemini `generateContent` JSON (needs `GEMINI_API_KEY`)

**What to look for**

- Each line should show **`[PASS]`** for Pollen, iNat, and Gemini.
- If keys are missing or placeholders, you will see **`[FAIL]`** and a short reason — that is expected until `.env` is filled. Unit tests above should still have passed.

The script **returns exit code 0** if pytest + imports succeeded, even if verify fails (so CI can gate on unit tests only). Treat verify failures as **configuration/network** issues until all three show `[PASS]`.

---

### Live module checks (optional, uses real quotas)

```bash
python scripts/test_person_b.py --live
```

**Adds**

4. **`fetch_google_pollen`** — prints how many of the first **5** day slots have data and sample `types` keys for day 0; confirms indices **5–13** are `None`.
5. **`generate_forecast_and_advisory`** — one Gemini call with a **minimal fake daily forecast**; prints narrative/advisory key counts.

**Optional extras**

```bash
python scripts/test_person_b.py --live --photo
```

- Runs **`classify_photo`** with a tiny 1×1 JPEG (not a real plant). You should still get a JSON-style response; species may be unknown — goal is **no HTTP/API error**.

```bash
python scripts/test_person_b.py --live --inat-delta
```

- Runs **`fetch_inat_delta`** for a San Diego–style bbox with **`since_days=3`**. This is **slow** (rate limits ~1 request/second across many queries). Expect a count of observations printed.

**What to look for**

- **`[OK] Live checks finished without exception.`**
- Google: **`5/5`** or fewer filled slots is OK if the API returns fewer days; structure should still show **14** slots when inspected in code.
- Gemini: keys like `headline`, `general_measures` present in the returned dicts (exact shape in logs).
- Photo: no **502** / **400** from Gemini; `species_name` may be generic.

---

### Full backend test suite (Person A + shared logic)

```bash
python scripts/test_person_b.py --all-tests
```

Runs **`pytest backend/tests/`** (includes `test_fusion.py`, `test_phenology.py`, etc.). Use this before a demo to catch integration regressions outside Person B–only files.

---

### Verbose pytest

```bash
python scripts/test_person_b.py -v --offline
```

Shows each test name as it runs.

---

## Standalone scripts (also used by the runner)

| Script | Purpose |
|--------|--------|
| `scripts/verify_person_b_apis.py` | Quick **curl-equivalent** checks for Pollen + iNat + Gemini |
| `scripts/test_person_b.py` | **Orchestrates** pytest + imports + verify + optional `--live` checks |

Run verify alone:

```bash
python scripts/verify_person_b_apis.py
```

---

## Quick reference — healthy vs unhealthy

| Output | Meaning |
|--------|--------|
| `pytest ... passed` / exit 0 | Unit tests OK |
| `advisory_kb top-level keys:` | `advisory_kb.json` found and loaded |
| `[PASS]` × 3 in verify | Keys + network OK for all three services |
| `[FAIL] GOOGLE_POLLEN_API_KEY is missing` | Set key in `.env` |
| `Live check error: ...` | Often quota, bad key, or model name — read exception |
| iNat delta run **minutes** | Normal — many sequential requests |

---

## Person B scope checklist (`plan.md`)

| Block | Deliverable | Wired in backend |
|-------|-------------|------------------|
| 0–2 | Env + API smoke | `scripts/verify_person_b_apis.py` |
| 2–6 | `fetch_inat_delta`, bbox, dedupe, pagination | `inat_client.py` → `POST /api/ingest/delta` |
| 6–10 | `fetch_google_pollen` / `fetch`, 14-day padding, UPI + `GOOGLE_TO_INAT_MAP` | `google_pollen_client.py` → `build_forecast_response` → `GET /api/forecast` |
| 10–14 | Gemini narrative + advisory (batched), species explainer | `gemini_agents.py` → forecast + photo explainer |
| 14–16 | `classify_photo` (vision) | `photo_classifier.py` → `POST /api/photo` |
| 16–18 | Integration | `main.py`: forecast, ingest, photo (photo uses `build_forecast_response` without a second Gemini call when cache is cold) |

---

## Person B files exercised

- `backend/inat_client.py`
- `backend/google_pollen_client.py`
- `backend/gemini_agents.py`
- `backend/photo_classifier.py`
- `backend/data/advisory_kb.json`

For end-to-end API behavior, also run the FastAPI app (`uvicorn main:app` from `backend/`) and hit `/api/forecast`, `/api/photo`, and `/api/ingest/delta` as described in `plan.md`.
