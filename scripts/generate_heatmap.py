"""
Pre-compute heatmap GeoJSON for a demo location and save to backend/data/.
Run once before the demo to avoid per-request computation.

Usage:
    python generate_heatmap.py [lat] [lng] [radius_rings]
    python generate_heatmap.py 32.71 -117.16 5
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from heatmap_generator import save_heatmap

if __name__ == "__main__":
    lat          = float(sys.argv[1]) if len(sys.argv) > 1 else 32.71
    lng          = float(sys.argv[2]) if len(sys.argv) > 2 else -117.16
    radius_rings = int(sys.argv[3])   if len(sys.argv) > 3 else 5

    print(f"Generating heatmap: center=({lat}, {lng}), rings={radius_rings} ...")
    save_heatmap(lat, lng, "heatmap_cache.json", radius_rings)
