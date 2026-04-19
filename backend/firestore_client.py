import os
from datetime import datetime, timedelta

USE_FIRESTORE = os.getenv("USE_FIRESTORE", "false").lower() == "true"

if USE_FIRESTORE:
    from google.cloud import firestore
    _db = firestore.Client()
else:
    _db = None
    _local_cache: dict = {}


def save_forecast(h3_cell: str, data: dict) -> None:
    data["cached_at"] = datetime.utcnow().isoformat()
    if USE_FIRESTORE:
        _db.collection("forecasts").document(h3_cell).set(data)
    else:
        _local_cache[f"forecast:{h3_cell}"] = data


def get_cached_forecast(h3_cell: str, max_age_hours: int = 6) -> dict | None:
    if USE_FIRESTORE:
        doc = _db.collection("forecasts").document(h3_cell).get()
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


def save_observations(observations: list[dict]) -> None:
    """Batch write observations to Firestore or local cache."""
    if USE_FIRESTORE:
        batch = _db.batch()
        for obs in observations:
            ref = _db.collection("observations").document(obs["id"])
            batch.set(ref, obs)
        batch.commit()
    else:
        for obs in observations:
            _local_cache[f"obs:{obs['id']}"] = obs


def get_recent_observations(h3_cells: list[str], since_hours: int = 168) -> list[dict]:
    """Fetch observations from the last `since_hours` hours for the given H3 cells."""
    cutoff = datetime.utcnow() - timedelta(hours=since_hours)

    if USE_FIRESTORE:
        results = []
        for cell in h3_cells:
            docs = (
                _db.collection("observations")
                .where("h3_cell", "==", cell)
                .where("observed_at", ">=", cutoff.isoformat())
                .stream()
            )
            results.extend(doc.to_dict() for doc in docs)
        return results

    # Local cache fallback: scan all stored observations
    results = []
    for key, obs in _local_cache.items():
        if not key.startswith("obs:"):
            continue
        if obs.get("h3_cell") not in h3_cells:
            continue
        try:
            obs_time = datetime.fromisoformat(obs.get("observed_at", ""))
            if obs_time >= cutoff:
                results.append(obs)
        except ValueError:
            continue
    return results
