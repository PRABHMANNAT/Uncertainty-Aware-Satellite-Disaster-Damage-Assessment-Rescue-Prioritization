# What the software does

DisasterIQ connects paired-image inspection, approximate damage estimates, reviewable zone rankings and report handoff. Start at `/`; use `/demonstrations` for curated cases and `/research` for method explanations.

## Assessment workflow

1. Select one of ten bundled xBD image pairs, or upload both images.
2. Run **Analyze damage**. The default CPU heuristic matches brightness, estimates translation, thresholds RGB differences and removes small noisy regions.
3. Inspect the before/after images. Toggle the damage overlay, zoom or use fullscreen.
4. Review the summary and response zones. Scene totals are measured before the grid split; adding per-zone counts can duplicate components crossing boundaries.
5. Inspect the map. xBD control points can support WGS84 locations; ordinary uploads use image-space positions rather than invented geographic coordinates.
6. Read the source-labelled situation brief, add analyst notes and export the field report, zone CSV or valid geographic GeoJSON.
7. Choose **Explain this assessment** to inspect the selected zone's actual numerical calculation.

The score is `100 × (2 × minor + 3.5 × major + 5 × destroyed) / (5 × total components)`. Scores of at least 50 are high priority; 20–49.99 are medium. Counts are connected-component approximations. The default heuristic has no intact-building detector or probability confidence. The optional narrator describes the ranking and cannot change it.

The application mask uses 0 for background and 1–4 for no damage, minor, major and destroyed. The manuscript indexes its four damage classes as 0–3 on building pixels. Map these encodings explicitly before comparing labels or computing metrics.

Implementation references: [inference](../backend/app/services/inference.py), [scoring](../backend/app/services/scoring.py), [georeferencing](../backend/app/services/georef.py), [narration](../backend/app/services/narrator.py) and [reports](../backend/app/services/report.py).

## Demonstrations and evidence

| Case | Evidence and controls |
|---|---|
| Mexico earthquake | Bundled xBD imagery; automated execution of the complete local analysis and reporting workflow. |
| Maui wildfires | Microsoft/Planet reference/post imagery and published damage overlay. The source caption and tile path disagree on 9 versus 10 August 2023; the app retains the discrepancy. |
| Derna flooding | Published Microsoft/Planet before/after flood imagery and source-produced damage layer. |
| Hurricane Beryl | Published post-event imagery and damage layer; the Esri reference imagery is undated and not a verified pre-event acquisition. |
| Israel/Gaza historical comparison | Separate Gaza City and Southern Israel/Sderot areas; 27 September and 1 November 2023 Sentinel-2 crops at 10 m resolution. Regional context only. |

The map supports available before/after views, swipe, published-layer opacity, street maps, extent reset and guided playback. Playback waits for imagery to load. Saved-case bookmarks persist in the browser; case-study PDFs retain evidence sources and limitations. Historical scenes are dated observations rather than current operational imagery or causal attribution.

See [demonstration definitions](../frontend/src/lib/demonstrations.ts) and [historical provenance](../frontend/public/historical/provenance.json).

## Paper Explorer

| Section | Behavior | Relation to the paper |
|---|---|---|
| Method walkthrough | Explains the implemented compare/detect/summarize/qualify/prioritize/review stages. | Explains repository code, not execution of the complete proposed architecture. |
| Priority-score lab | Editable component counts, contributions, example comparisons and what-if weights. | Demonstrates the current deterministic score, not R(κ). |
| Uncertainty lab | Synthetic class distributions, entropy, top probability, margin and review thresholds. | Teaches ambiguity; it does not add MC dropout or calibration to the heuristic. |
| Validation lab | Editable confusion matrix with accuracy, precision, recall, F1 and IoU. | Demonstrates metrics rather than publishing measured model results. |
| Explain an assessment | Reads a compact numerical result from session storage and explains a selected zone. | Uses a real app assessment, retaining unavailable confidence as unavailable. |
| Export/reset | Exports explanation JSON with separate example/result fields, and resets educational inputs. | Preserves the distinction between simulated examples and observations. |

## Current software versus proposed study

The application is an inspection and explanation prototype. A supplied PyTorch checkpoint can enable an optional adapter with class-probability output, but the repository does not ship a trained checkpoint implementing all the manuscript's contributions. MC-dropout sampling, fitted calibration, the two probabilistic queues and the registered comparative experiment remain separate research work. See [methodology](methodology.md) and [results](results-and-limitations.md).
