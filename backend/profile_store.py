from datetime import datetime
from typing import Optional

from firestore_client import USE_FIRESTORE, _db

# In-process fallback when Firestore is disabled
_profile_cache: dict[str, dict] = {}


def save_profile(profile: dict) -> None:
    profile["updated_at"] = datetime.utcnow().isoformat()
    if USE_FIRESTORE:
        _db.collection("user_profiles").document(profile["user_id"]).set(profile)
    else:
        _profile_cache[profile["user_id"]] = dict(profile)


def get_profile(user_id: str) -> Optional[dict]:
    if USE_FIRESTORE:
        doc = _db.collection("user_profiles").document(user_id).get()
        return doc.to_dict() if doc.exists else None
    return _profile_cache.get(user_id)


def delete_profile(user_id: str) -> bool:
    if USE_FIRESTORE:
        ref = _db.collection("user_profiles").document(user_id)
        if not ref.get().exists:
            return False
        ref.delete()
        return True
    if user_id not in _profile_cache:
        return False
    del _profile_cache[user_id]
    return True


def get_all_profiles() -> list[dict]:
    if USE_FIRESTORE:
        return [doc.to_dict() for doc in _db.collection("user_profiles").stream()]
    return list(_profile_cache.values())
