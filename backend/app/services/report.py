"""Source-aware, print-ready reports with explicit assessment limitations."""
from __future__ import annotations

import base64
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas import AnalysisResult

INK = colors.HexColor("#25332e")
ACCENT = colors.HexColor("#c97a51")
MUTED = colors.HexColor("#738078")
LINE = colors.HexColor("#e0e6e1")
PAPER = colors.HexColor("#f4f7f4")
CLASS_COLORS = [colors.HexColor(value) for value in ["#628775", "#c3a45a", "#d58a58", "#bb6660"]]
WIDTH = A4[0] - 88
ASSETS = Path(__file__).resolve().parents[1] / "assets"
STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle(name="ReportTitle", fontName="Helvetica-Bold", fontSize=24, leading=29, textColor=INK, spaceAfter=10))
STYLES.add(ParagraphStyle(name="ReportHeading", fontName="Helvetica-Bold", fontSize=13, leading=18, textColor=INK, spaceBefore=15, spaceAfter=9))
STYLES.add(ParagraphStyle(name="ReportBody", fontName="Helvetica", fontSize=10, leading=15, textColor=INK, spaceAfter=8))
STYLES.add(ParagraphStyle(name="ReportSmall", fontName="Helvetica", fontSize=8, leading=12, textColor=MUTED, spaceAfter=6))


def para(text: str, style="ReportBody"):
    # Helvetica has no general Unicode coverage. Use readable equivalents for
    # punctuation in source notes and preserve escaped user text.
    text = text.replace("\u2013", "-").replace("\u2014", " - ").replace("\u2192", " to ")
    return Paragraph(escape(text).replace("\n", "<br/>"), STYLES[style])


def section(title: str):
    return para(title, "ReportHeading")


def decorated(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(44, A4[1] - 42, A4[0] - 44, A4[1] - 42)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.setFillColor(INK)
    canvas.drawString(44, A4[1] - 30, "DisasterIQ / Assessment & evidence")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(A4[0] - 44, A4[1] - 30, datetime.now(timezone.utc).strftime("Generated %d %b %Y, %H:%M UTC"))
    canvas.line(44, 39, A4[0] - 44, 39)
    canvas.drawString(44, 25, "Decision support. Findings require independent field verification.")
    canvas.drawRightString(A4[0] - 44, 25, f"{doc.page}")
    canvas.restoreState()


def document(buffer, title):
    return SimpleDocTemplate(buffer, pagesize=A4, rightMargin=44, leftMargin=44, topMargin=63, bottomMargin=54, title=title, author="DisasterIQ")


def table(rows, widths, header=True):
    rendered = [[cell if not isinstance(cell, (str, int, float)) else para(str(cell), "ReportSmall") for cell in row] for row in rows]
    result = Table(rendered, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("LINEBELOW", (0, 0), (-1, -1), .4, LINE)]
    if header: style += [("BACKGROUND", (0, 0), (-1, 0), PAPER), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold")]
    result.setStyle(TableStyle(style))
    return result


def image_flowable(source, width, height):
    result = Image(source)
    ratio = min(width / result.imageWidth, height / result.imageHeight)
    result.drawWidth, result.drawHeight = result.imageWidth * ratio, result.imageHeight * ratio
    result.hAlign = "CENTER"
    return result


def _counts(analysis):
    if analysis.summary.building_counts:
        counts = analysis.summary.building_counts
        return [counts.none, counts.minor, counts.major, counts.destroyed]
    # Older clients do not supply scene-wide counts. Do not silently invent
    # those counts from rounded percentages or boundary-split zone totals.
    return None


def _method_notes(analysis):
    notes = ["Counts estimate connected components in a semantic mask; they are not verified building IDs. Splitting a scene into zones can split the same component across boundaries. Use scene-wide totals for summary statistics."]
    if analysis.inference_mode.startswith("stub"):
        notes += ["Image-change heuristic, not a trained building-damage model. Shadows, vegetation, seasonal changes and registration errors can resemble damage. Intact buildings are not detected in this mode."]
    if not any(zone.confidence is not None for zone in analysis.zones):
        notes += ["Prediction confidence is unavailable. No accuracy, probability, error margin or confidence interval has been inferred."]
    notes += ["Satellite observations cannot establish structural safety, interior damage, casualties, access conditions or resource requirements. Human validation is required."]
    return notes


def generate_report_pdf(analysis: AnalysisResult, brief: str, analyst_notes: str = "") -> bytes:
    buffer = io.BytesIO()
    doc = document(buffer, "DisasterIQ Field Assessment Report")
    zones = sorted(analysis.zones, key=lambda zone: zone.rank)
    geo = analysis.geo_available and analysis.geo_mode != "image"
    title = (analysis.pair_id or "Uploaded imagery").replace("_", " ").replace("-", " ").title()
    story = [para("Field assessment report", "ReportTitle"), para(title), para(f"Assessment method: {analysis.inference_mode} | Coordinate reference: {'WGS84' if geo else 'image pixels'}", "ReportSmall")]
    counts = _counts(analysis)
    summary_rows = [["Scene components", "High-priority zones", "Major + destroyed", "Zones assessed"], [f"{analysis.summary.total_buildings:,}", sum(zone.priority_score >= 50 for zone in zones), f"{analysis.summary.major_pct + analysis.summary.destroyed_pct:.2f}%", len(zones)]]
    story += [table(summary_rows, [WIDTH / 4] * 4), section("Damage composition")]
    rows = [["Damage class", "Scene-wide estimate", "Share"]]
    names = ["No detected damage", "Minor", "Major", "Destroyed"]
    percentages = [max(0, 100 - analysis.summary.minor_pct - analysis.summary.major_pct - analysis.summary.destroyed_pct) if analysis.summary.total_buildings else 0, analysis.summary.minor_pct, analysis.summary.major_pct, analysis.summary.destroyed_pct]
    for index, name in enumerate(names):
        rows.append([name, f"{counts[index]:,}" if counts else "Not supplied by client", f"{percentages[index]:.2f}%"])
    composition = table(rows, [WIDTH * .42, WIDTH * .32, WIDTH * .26])
    composition.setStyle(TableStyle([("LINEBEFORE", (0, i + 1), (0, i + 1), 3, CLASS_COLORS[i]) for i in range(4)]))
    story += [composition, section("Situation brief"), para(brief or "No situation brief was provided.")]
    story += [section("Interpretation & uncertainty")]
    story += [para(note, "ReportSmall") for note in _method_notes(analysis)]

    story += [PageBreak(), para("Spatial evidence", "ReportTitle"), para("Imagery and assessment overlay", "ReportSmall")]
    pre_path = post_path = None
    try:
        from app.services.inference import resolve_demo_pair
        if analysis.pair_id:
            pair = resolve_demo_pair(analysis.pair_id)
            pre_path, post_path = Path(pair["pre_path"]), Path(pair["post_path"])
    except (FileNotFoundError, KeyError):
        pass
    if pre_path and post_path:
        pair_images = table([[image_flowable(str(pre_path), WIDTH / 2 - 18, 210), image_flowable(str(post_path), WIDTH / 2 - 18, 210)], ["Before event", "After event"]], [WIDTH / 2] * 2, header=False)
        story += [pair_images, para("Imagery: xBD / xView2, Maxar Open Data. Capture dates are not verified in this report. Dataset license: CC BY-NC-SA 4.0 (non-commercial).", "ReportSmall")]
    else:
        story += [para("Source imagery is not retained in this report for uploaded pairs. Preserve the original acquisition files with the assessment.")]
    if analysis.mask_base64 and len(analysis.mask_base64) < 12_000_000:
        try:
            mask = PILImage.open(io.BytesIO(base64.b64decode(analysis.mask_base64, validate=True))).convert("RGBA")
            if post_path:
                with PILImage.open(post_path) as base:
                    base = base.convert("RGBA")
                    if mask.size == base.size: mask = PILImage.alpha_composite(base, mask)
            encoded = io.BytesIO(); mask.save(encoded, format="PNG"); encoded.seek(0)
            story += [section("Damage overlay"), image_flowable(encoded, WIDTH, 285), para("Green: no detected damage | Yellow: minor | Orange: major | Red: destroyed. Visual estimates require verification.", "ReportSmall")]
        except (ValueError, OSError):
            story += [para("The assessment overlay could not be decoded. Zone data is retained below.", "ReportSmall")]
    else:
        story += [para("No assessment overlay was supplied.", "ReportSmall")]

    story += [PageBreak(), para("Response zones & handoff", "ReportTitle"), para("Priority is a relative severity score. It does not estimate casualties or prescribe rescue staffing.", "ReportSmall")]
    rows = [["Rank / score", "None / minor", "Major / destroyed", "Confidence", "Location"]]
    for zone in zones:
        if zone.centroid_lat is not None and zone.centroid_lng is not None:
            location = f"{zone.centroid_lat:.5f}, {zone.centroid_lng:.5f}" if geo else f"x={zone.centroid_lng:.0f}, y={zone.centroid_lat:.0f} px"
        else: location = "Not supplied"
        b = zone.building_counts
        rows.append([f"{zone.rank} / {zone.priority_score:.1f}", f"{b.none} / {b.minor}", f"{b.major} / {b.destroyed}", f"{zone.confidence * 100:.1f}%" if zone.confidence is not None else "Unavailable", location])
    story += [table(rows, [WIDTH * .16, WIDTH * .17, WIDTH * .20, WIDTH * .17, WIDTH * .30])]
    story += [section("Analyst notes"), para(analyst_notes or "No analyst notes were recorded."), section("Verification checklist")]
    story += [para(text, "ReportSmall") for text in ["Confirm acquisition dates, sensor resolution and spatial alignment.", "Check the highest-priority zones against independent field observations and current access information.", "Record unresolved cloud, shadow and confidence limitations before handoff."]]
    doc.build(story, onFirstPage=decorated, onLaterPages=decorated)
    return buffer.getvalue()


def generate_demonstration_pdf(scenario_id: str, area: str | None = None) -> bytes:
    registry = json.loads((ASSETS / "demonstrations.json").read_text(encoding="utf-8"))
    scenario = next((item for item in registry if item["id"] == scenario_id), None)
    if scenario is None: raise KeyError(scenario_id)
    selected_area = next((item for item in scenario.get("areas", []) if item["id"] == (area or "gaza-city")), None)
    if area and not selected_area: raise KeyError(area)
    buffer = io.BytesIO(); doc = document(buffer, f"DisasterIQ Case Study - {scenario['title']}")
    story = [para("Case-study evidence report", "ReportTitle"), para(scenario["title"]), para(scenario["location"], "ReportSmall"), section("Scope"), para(scenario["purpose"])]
    story += [table([["Reference observation", "Later observation"], [scenario["beforeLabel"], scenario["afterLabel"]]], [WIDTH / 2] * 2)]
    story += [section("Evidence type"), para("Regional, historical image comparison; no building-level inference." if scenario["kind"] == "historical" else "Published Microsoft damage layer; not a new DisasterIQ inference." if scenario["kind"] == "microsoft" else "Local paired-imagery demonstration. Run the assessment workspace for a computed field report.")]
    story += [section("Interpretation & uncertainty"), para(scenario["notes"]), section("Source & attribution"), para(scenario["source"]), para(scenario["sourceUrl"], "ReportSmall")]
    if scenario["kind"] == "historical" and selected_area:
        story += [PageBreak(), para("Dated satellite observations", "ReportTitle"), para(selected_area["label"]), para("The reference date is 7 October 2023. Images show observations before and after that date, not proof of cause, responsibility, casualty counts or individual structural damage.")]
        image_rows = []
        for phase in ["before", "after"]:
            path = ASSETS / "historical" / Path(selected_area[phase]).name
            image_rows.append(image_flowable(str(path), WIDTH / 2 - 12, 245))
        story += [table([image_rows, [scenario["beforeLabel"], scenario["afterLabel"]]], [WIDTH / 2] * 2, header=False), section("Acquisition provenance")]
        metadata = json.loads((ASSETS / "historical" / "provenance.json").read_text(encoding="utf-8"))
        for item in metadata["images"]:
            if item["file"].startswith(selected_area["id"]):
                story += [para(f"{item['date']} | {item['scene_id']}", "ReportSmall"), para(item["stac_url"], "ReportSmall"), para(f"WGS84 extent: {item['bbox']}. Processing: {item['processing']}", "ReportSmall")]
        story += [section("Independent published assessment"), para("UNOSAT's Gaza Governorate assessment from 15 October 2023 is a separate, geographically and temporally bounded source. Its figures are not presented as results of these images or extrapolated to Israel."), para("https://unosat.org/products/3698", "ReportSmall")]
    else:
        story += [section("Use the interactive evidence"), para("Open the original source or the app's demonstration center to compare imagery, inspect the published overlay, and change map layers. Streaming imagery is not redistributed in this report. No unsupported numerical building counts or confidence values are assigned.")]
    doc.build(story, onFirstPage=decorated, onLaterPages=decorated)
    return buffer.getvalue()
