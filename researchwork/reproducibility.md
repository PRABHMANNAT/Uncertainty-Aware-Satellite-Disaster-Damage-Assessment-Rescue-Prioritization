# Reproducibility and research handoff

The manuscript gives a protocol and reports a stored-output pilot. A complete independent reproduction needs more artifacts than the application and the figure images alone.

## Reproduce the paper figure screenshots

Install the optional documentation dependency and supply the original PDF locally:

```powershell
python -m pip install pymupdf
python researchwork/tools/extract_figures.py "path/to/Updated Research Paper (2).pdf"
```

The script renders cropped source-page regions without redrawing their content. [provenance.json](figures/provenance.json) records the source SHA-256, page numbers, crop rectangles, resolution and output hashes. Pixel-level output hashes may vary across renderer versions; retain the source hash and crop specification when comparing reproductions. This recreates illustrations, not model results.

## Required artifacts for the reported pilot

- Exact public fixture filenames, repository commit and download URLs.
- Stored localization/damage tensors with hashes, original shapes, encodings and channel ordering.
- The exact localization threshold rule and its implementation/version.
- Normalization rules, including handling of zero-sum, invalid or masked scores.
- Code that derives class counts, building-only entropy, ordinal variance and illustrative κ = 1 risk maps.
- Per-fixture and aggregate diagnostic outputs, saved settings and environment versions.

These original pilot artifacts are not bundled with the supplied manuscript/repository materials. The diagnostics in the README are therefore attributed to the manuscript rather than advertised as a newly reproduced experiment.

## Required artifacts for the full study

1. Acquire xBD under its terms, inventory the release and save dataset hashes.
2. Freeze an event-grouped split manifest; check shared scenes and overlapping crops.
3. Specify each baseline's input dates, prediction heads and supervision.
4. Record preprocessing, synchronized augmentations, ignored labels and class balancing.
5. Log exact training settings, seeds, checkpoint selection and hardware/software versions.
6. Keep test data out of training, hyperparameter selection, temperature fitting and MC-pass convergence decisions.
7. Save raw logits, stochastic predictions, calibrated outputs and evaluation labels.
8. Specify pixel/building/cell aggregation and κ/review-threshold sensitivity procedures.
9. Publish evaluation code, class support, uncertainty/calibration metrics, event-wise intervals, ablations and actual runtime measurements.

## Clarifications before executing the registered protocol

The supplied text contains details that need an explicit experimental decision:

- Its preprocessing paragraph mentions class-balanced sampling from validation, while Table I limits augmentation to training events. Keep evaluation distributions untouched and document the final train-only sampling policy.
- One paragraph describes all baselines as post-only, while Table I separately names post-only ResNet-50 and bi-temporal models. Specify each actual input configuration.
- Define whether temperature scaling applies to every stochastic logit sample or another precisely specified aggregation. The figure and equations alone do not settle this implementation detail.
- Specify how pixel probabilities and uncertainty become building/cell priorities, and how ignored or zero-sum score locations are handled.
- Distinguish proposed training settings from those already used in the legacy model adapter; they are not interchangeable evidence.

These notes flag reproducibility decisions rather than silently changing the source paper or treating a suggested correction as an executed experiment.

## Provenance and rights

Keep source/provider credits with imagery and figures. Dataset permissions, institutional trademarks and manuscript rights are separate from the project's Apache source-code license. A source-paper image does not authorize new operational, causal, casualty or accessibility claims. See [NOTICE](../NOTICE) and [figure attribution](figures/README.md).
