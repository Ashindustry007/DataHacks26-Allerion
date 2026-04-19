import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_POLLEN_API_KEY = os.getenv("GOOGLE_POLLEN_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Generative Language API model id (override if Google deprecates defaults)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_GENERATE_CONTENT_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
# Optional: iNaturalist OAuth application id (better rate limits / attribution)
INAT_APP_ID = os.getenv("INAT_APP_ID")

# H3 resolution 4 = ~22km hexagons (metro-level granularity)
H3_RESOLUTION = 4

ALLERGEN_SPECIES = [
    {"taxon_id": 48678, "name": "Common ragweed",      "pollen_type": "weed",  "allergenicity": 5, "google_code": "RAGWEED"},
    {"taxon_id": 56928, "name": "White oak",            "pollen_type": "tree",  "allergenicity": 4, "google_code": "OAK"},
    {"taxon_id": 48734, "name": "Paper birch",          "pollen_type": "tree",  "allergenicity": 4, "google_code": "BIRCH"},
    {"taxon_id": 49085, "name": "Eastern red cedar",    "pollen_type": "tree",  "allergenicity": 3, "google_code": "JUNIPER"},
    {"taxon_id": 64727, "name": "Timothy grass",        "pollen_type": "grass", "allergenicity": 4, "google_code": "GRAMINALES"},
    {"taxon_id": 49095, "name": "Green ash",            "pollen_type": "tree",  "allergenicity": 3, "google_code": "ASH"},
    {"taxon_id": 54772, "name": "American elm",         "pollen_type": "tree",  "allergenicity": 3, "google_code": "ELM"},
    {"taxon_id": 53548, "name": "Eastern cottonwood",   "pollen_type": "tree",  "allergenicity": 2, "google_code": "COTTONWOOD"},
    {"taxon_id": 52823, "name": "Olive",                "pollen_type": "tree",  "allergenicity": 4, "google_code": "OLIVE"},
    {"taxon_id": 52856, "name": "Common mugwort",       "pollen_type": "weed",  "allergenicity": 3, "google_code": "MUGWORT"},
    {"taxon_id": 48513, "name": "Red alder",            "pollen_type": "tree",  "allergenicity": 3, "google_code": "ALDER"},
    {"taxon_id": 64698, "name": "Kentucky bluegrass",   "pollen_type": "grass", "allergenicity": 4, "google_code": "GRAMINALES"},
    {"taxon_id": 56891, "name": "Northern red oak",     "pollen_type": "tree",  "allergenicity": 4, "google_code": "OAK"},
    {"taxon_id": 56610, "name": "Giant ragweed",        "pollen_type": "weed",  "allergenicity": 5, "google_code": "RAGWEED"},
    {"taxon_id": 47602, "name": "Perennial ryegrass",   "pollen_type": "grass", "allergenicity": 4, "google_code": "GRAMINALES"},
]

# Map Google plant codes to taxon IDs for fusion
GOOGLE_TO_INAT_MAP: dict[str, list[int]] = {
    "OAK":        [56928, 56891],
    "BIRCH":      [48734],
    "JUNIPER":    [49085],
    "ASH":        [49095],
    "ELM":        [54772],
    "COTTONWOOD": [53548],
    "OLIVE":      [52823],
    "ALDER":      [48513],
    "RAGWEED":    [48678, 56610],
    "MUGWORT":    [52856],
    "GRAMINALES": [64727, 64698, 47602],
}
