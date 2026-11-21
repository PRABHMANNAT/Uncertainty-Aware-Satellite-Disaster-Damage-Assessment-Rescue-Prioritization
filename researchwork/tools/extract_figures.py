"""Render the two manuscript figures without redrawing their content.

Usage: python researchwork/tools/extract_figures.py "path/to/manuscript.pdf"
Optional dependency: pip install pymupdf
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import pymupdf

FIGURES = [
    ("figure-1-architecture.png", 3, (54, 55, 372, 160), "Architecture diagram body; caption is transcribed in the documentation."),
    ("figure-2-joplin-pilot.png", 4, (45, 51, 567, 236), "Four-panel Joplin pilot figure, including the original interpretation note and caption."),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paper", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "figures")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(args.paper)
    records = []
    for filename, page, bounds, description in FIGURES:
        if len(doc) < page:
            raise ValueError(f"Expected at least {page} manuscript pages")
        image = doc[page - 1].get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=pymupdf.Rect(bounds), alpha=False)
        path = args.output / filename
        image.save(path)
        records.append({"file": filename, "page": page, "crop_pdf_points": list(bounds), "dpi": 216,
                        "size_pixels": [image.width, image.height], "description": description,
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    metadata = {"source_filename": args.paper.name, "source_sha256": hashlib.sha256(args.paper.read_bytes()).hexdigest(),
                "manuscript_title": "Uncertainty-Aware Satellite Imaging for Disaster Damage Assessment and Rescue Prioritization",
                "authors": ["Prabhmannat Singh", "Atharva Pratap Singh Chundawat", "Srijan Sachdeva", "Yogiraj Bhale"],
                "method": "Direct PyMuPDF page rendering and cropping. No diagram recreation, synthetic imagery, or result modification.",
                "figures": records}
    (args.output / "provenance.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"Rendered {len(records)} figures into {args.output}")


if __name__ == "__main__":
    main()
