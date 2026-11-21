# Experimental protocol

Source: supplied manuscript, Sections III-H and IV, and Tables I–II. The complete experiment is **registered/proposed, not executed**. This file is a run plan rather than a results report.

## Dataset and partitions

Use the official xBD paired imagery, polygons and metadata. Recompute inventory counts from the acquired release, record file hashes, ignore unclassified damage labels, and group entire disaster events into train/validation/test partitions. Check scene and crop overlap so a nominally different tile cannot leak the same observation into another partition.

Training uses paired 512 × 512 crops. Record synchronized image/mask augmentations and class-balancing choices. Apply class reweighting or sampling to training data; preserve untouched validation/test distributions for calibration and evaluation. The manuscript contains ambiguous sampling wording that must be resolved before execution; see [reproducibility.md](reproducibility.md).

## Models and ablations

The manuscript names a post-event ResNet-50 comparator, U-Net, Siamese U-Net, BIT and the proposed Siamese uncertainty-aware framework. Specify each model's actual input dates and prediction tasks before running comparisons; do not silently treat every baseline as post-only.

Register ablations that isolate the contribution of pre-event input, absolute feature-difference fusion, MC dropout, calibration and the priority layer. Use equivalent data partitions and documented training budgets. Calibration can change confidence metrics while leaving argmax-based F1 unchanged.

## Training and calibration records

| Setting | Registered requirement |
|---|---|
| Optimizer | AdamW |
| Learning rate, batch size, epochs, stopping | Select on validation events and record exact values; no completed optimum is reported. |
| Seeds | 11, 23 and 47 |
| MC passes | Start at 30; record convergence tolerance and final count. |
| Temperature | Fit on validation data after freezing weights. |
| Software/hardware | Record actual Python, PyTorch, CUDA/cuDNN, GPU and package versions. |
| Checkpoints | Record source, hash, training split, epoch and selection rule. |

The manuscript's proposed full-study environment and its CPU fixture post-processing environment differ. Neither should be substituted for the hardware actually used by an app deployment.

## Evaluation

| Question | Measures |
|---|---|
| Are buildings localized? | Building IoU, mean IoU and Dice |
| Are severity classes distinguished? | Per-class precision/recall/F1, macro-F1, weighted-F1, class support; one-vs-rest ROC-AUC only when valid scores/labels exist |
| Does confidence match correctness? | 15-bin ECE, NLL, multiclass Brier score and reliability diagrams |
| Does review selection help? | Register a review threshold/capacity policy and selective-prediction evaluation before making a benefit claim. |
| How stable is the result? | Event-wise bootstrap intervals, seed variation, held-out-disaster analysis and κ sensitivity |
| What does it cost? | Measured end-to-end runtime, memory, transfer and pass count on identified hardware |

Always specify whether an evaluation unit is a pixel, matched building or aggregate cell. Avoid mixing these units in one confusion matrix. Background and ignored labels need explicit handling.

## Completion rule

Publish the split manifest, trained artifacts, raw predictions, reference labels, evaluation code and metrics before filling a result table. A software test, synthetic validation-lab example, unlabeled fixture pilot or number quoted from another paper cannot fill an unexecuted model-result row.
