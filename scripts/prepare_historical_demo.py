"""Reproduce the dated, region-level Copernicus comparison (optional rasterio).

Downloads only COG windows via HTTP range requests. These 10 m RGB crops are
for contextual comparison, never individual-building damage classification.
"""
from pathlib import Path
import json

import certifi
import numpy as np
from PIL import Image
import rasterio
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds
from rasterio.enums import Resampling

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "historical"
DATES = {
    "before": ("2023-09-27", "S2A_36RXV_20230927_0_L2A"),
    "after": ("2023-11-01", "S2B_36RXV_20231101_0_L2A"),
}
AREAS = {
    "gaza-city": [34.405, 31.48, 34.485, 31.56],
    "southern-israel": [34.55, 31.485, 34.63, 31.565],
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"provider": "Copernicus Sentinel-2 L2A / Element 84 Earth Search", "resolution_m": 10, "images": []}
    with rasterio.Env(GDAL_HTTP_CAINFO=certifi.where(), GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        for phase, (date, item_id) in DATES.items():
            month = str(int(date[5:7]))
            url = f"https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/R/XV/2023/{month}/{item_id}/TCI.tif"
            with rasterio.open(url) as source:
                for area, bbox in AREAS.items():
                    window = from_bounds(*transform_bounds("EPSG:4326", source.crs, *bbox), transform=source.transform)
                    pixels = source.read([1, 2, 3], window=window, out_shape=(3, 768, 768), resampling=Resampling.bilinear)
                    filename = f"{area}-{phase}.jpg"
                    Image.fromarray(np.moveaxis(pixels, 0, -1)).save(OUT / filename, quality=93)
                    manifest["images"].append({"file": filename, "date": date, "scene_id": item_id, "bbox": bbox, "asset_url": url, "stac_url": f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{item_id}", "processing": "RGB crop, bilinear resampling to 768x768; no synthetic alterations"})
                    print(filename, date, flush=True)
    (OUT / "provenance.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
