import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_POLLEN_API_KEY = os.getenv("GOOGLE_POLLEN_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")

# H3 resolution 4 = ~22km hexagons (metro-level granularity)
H3_RESOLUTION = 4

ALLERGEN_SPECIES = [
    {"taxon_id": 53587, "name": "Common ragweed",      "pollen_type": "weed",  "allergenicity": 5, "google_code": "RAGWEED"},
    {"taxon_id": 54779, "name": "White oak",            "pollen_type": "tree",  "allergenicity": 4, "google_code": "OAK"},
    {"taxon_id": 49883, "name": "Paper birch",          "pollen_type": "tree",  "allergenicity": 4, "google_code": "BIRCH"},
    {"taxon_id": 49399, "name": "Eastern red cedar",    "pollen_type": "tree",  "allergenicity": 3, "google_code": "JUNIPER"},
    {"taxon_id": 57190, "name": "Timothy grass",        "pollen_type": "grass", "allergenicity": 4, "google_code": "GRAMINALES"},
    {"taxon_id": 54808, "name": "Green ash",            "pollen_type": "tree",  "allergenicity": 3, "google_code": "ASH"},
    {"taxon_id": 53547, "name": "American elm",         "pollen_type": "tree",  "allergenicity": 3, "google_code": "ELM"},
    {"taxon_id": 52119, "name": "Eastern cottonwood",   "pollen_type": "tree",  "allergenicity": 2, "google_code": "COTTONWOOD"},
    {"taxon_id": 57140, "name": "Olive",                "pollen_type": "tree",  "allergenicity": 4, "google_code": "OLIVE"},
    {"taxon_id": 52856, "name": "Common mugwort",       "pollen_type": "weed",  "allergenicity": 3, "google_code": "MUGWORT"},
    {"taxon_id": 56034, "name": "Red alder",            "pollen_type": "tree",  "allergenicity": 3, "google_code": "ALDER"},
    {"taxon_id": 60307, "name": "Kentucky bluegrass",   "pollen_type": "grass", "allergenicity": 4, "google_code": "GRAMINALES"},
    {"taxon_id": 49005, "name": "Northern red oak",     "pollen_type": "tree",  "allergenicity": 4, "google_code": "OAK"},
    {"taxon_id": 53034, "name": "Giant ragweed",        "pollen_type": "weed",  "allergenicity": 5, "google_code": "RAGWEED"},
    {"taxon_id": 52801, "name": "Perennial ryegrass",   "pollen_type": "grass", "allergenicity": 4, "google_code": "GRAMINALES"},
]

# Map Google plant codes to taxon IDs for fusion
GOOGLE_TO_INAT_MAP: dict[str, list[int]] = {
    "OAK":        [54779, 49005],
    "BIRCH":      [49883],
    "JUNIPER":    [49399],
    "ASH":        [54808],
    "ELM":        [53547],
    "COTTONWOOD": [52119],
    "OLIVE":      [57140],
    "ALDER":      [56034],
    "RAGWEED":    [53587, 53034],
    "MUGWORT":    [52856],
    "GRAMINALES": [57190, 60307, 52801],
}
