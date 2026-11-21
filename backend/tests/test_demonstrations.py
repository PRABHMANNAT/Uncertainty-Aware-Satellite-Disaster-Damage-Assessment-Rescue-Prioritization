from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.report import ASSETS, generate_demonstration_pdf
from app.services.scoring import score_mask


def test_scene_summary_does_not_double_count_components_at_zone_boundaries(tmp_path):
    mask = np.zeros((20, 20), dtype=np.uint8)
    mask[8:12, 8:12] = 4  # One component crossing all four grid cells.
    path = tmp_path / "mask.png"
    Image.fromarray(mask).save(path)
    result = score_mask(path, grid_rows=2, grid_cols=2)
    assert sum(zone.building_counts.destroyed for zone in result.zones) == 4
    assert result.summary.total_buildings == 1
    assert result.summary.building_counts.destroyed == 1
    assert result.summary.destroyed_pct == 100.0


@pytest.mark.parametrize("scenario", ["mexico-earthquake", "maui-wildfire", "derna-flood", "beryl-hurricane", "israel-gaza-2023"])
def test_every_curated_demonstration_exports_a_report(scenario):
    result = generate_demonstration_pdf(scenario)
    assert result.startswith(b"%PDF-")
    assert len(result) > 1000


def test_historical_acquisitions_straddle_reference_date_and_have_provenance():
    metadata = json.loads((ASSETS / "historical" / "provenance.json").read_text(encoding="utf-8"))
    assert metadata["resolution_m"] == 10
    assert len(metadata["images"]) == 4
    for item in metadata["images"]:
        captured = date.fromisoformat(item["date"])
        assert captured < date(2023, 10, 7) if "before" in item["file"] else captured > date(2023, 10, 7)
        assert item["stac_url"].startswith("https://earth-search.aws.element84.com/")
        assert (ASSETS / "historical" / item["file"]).is_file()


def test_case_reports_reject_unknown_scenarios_and_areas():
    client = TestClient(app)
    assert client.get("/demonstrations/not-a-case/report/pdf").status_code == 404
    assert client.get("/demonstrations/israel-gaza-2023/report/pdf?area=unknown").status_code == 404
    response = client.get("/demonstrations/israel-gaza-2023/report/pdf?area=southern-israel")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


def test_historical_images_are_available_without_external_services():
    for filename in ["gaza-city-before.jpg", "gaza-city-after.jpg", "southern-israel-before.jpg", "southern-israel-after.jpg"]:
        with Image.open(ASSETS / "historical" / filename) as image:
            assert image.size == (768, 768)
