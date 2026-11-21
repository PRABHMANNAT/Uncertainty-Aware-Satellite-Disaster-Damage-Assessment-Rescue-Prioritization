# Literature review

This is a selected reading guide to the supplied manuscript's related work, not a systematic review or a new benchmark. Reference numbers below correspond to the manuscript. Links point to primary papers, author/institutional copies or official code. Bibliographic entries are in [references.bib](references.bib).

| Work | Role in this research | Boundary to keep in mind |
|---|---|---|
| **xBD**, Gupta et al., 2019 [3]. [Paper](https://arxiv.org/abs/1911.09296) | Supplies paired disaster imagery and building damage annotations, making localization and four-class damage assessment reproducible tasks. | A dataset or its published baseline is not evidence that this repository's model has achieved the same score. |
| **U-Net**, Ronneberger, Fischer and Brox, 2015 [16]. [Paper](https://arxiv.org/abs/1505.04597) | Encoder-decoder segmentation and skip connections motivate the proposed dense localization head. | Its original application is biomedical segmentation; disaster-specific behavior requires evaluation. |
| **Fully Convolutional Siamese Networks**, Daudt, Le Saux and Boulch, 2018 [17]. [Paper](https://arxiv.org/abs/1810.08462) | Motivates shared representations and feature differencing across two observation dates. | Detecting a change does not establish that a building is damaged. |
| **Multi-Temporal Fusion**, Weber and Kané, 2020 [9]. [Paper](https://arxiv.org/abs/2004.05525) | Connects paired imagery and data/training choices to building damage assessment on xBD. | Competition conditions and splits must be checked before transferring a performance claim. |
| **BIT**, Chen, Qi and Shi [19]. [Paper](https://arxiv.org/abs/2103.00208) | Provides a transformer-based bi-temporal context baseline for the registered comparison. | A change-detection result is not directly interchangeable with four-class damage performance. |
| **Focal loss**, Lin et al., 2017 [21]. [Paper](https://arxiv.org/abs/1708.02002) | Motivates reducing domination by easy majority examples under class imbalance. | This is a candidate training-loss choice, not an improvement demonstrated in the supplied study. |
| **MC dropout**, Gal and Ghahramani, 2016 [23]. [Paper](https://proceedings.mlr.press/v48/gal16.html) | Supports repeated stochastic predictions as an approximate Bayesian uncertainty approach. | Entropy from a single stored score map cannot substitute for inter-pass uncertainty. |
| **Temperature scaling**, Guo et al., 2017 [5]. [Paper](https://proceedings.mlr.press/v70/guo17a.html) | Motivates fitting a validation-only scalar temperature after freezing model weights. | Probability calibration and class discrimination are separate; unchanged argmax predictions do not gain F1 merely through temperature scaling. |
| **Deep ensembles**, Lakshminarayanan, Pritzel and Blundell, 2017 [24]. [Paper](https://arxiv.org/abs/1612.01474) | Provides an alternative uncertainty method for future comparison. | Multiple independently trained predictors require additional computation and storage. |
| **Uncertainty under dataset shift**, Ovadia et al., 2019 [6]. [Paper](https://arxiv.org/abs/1906.02530) | Motivates assessing uncertainty beyond familiar distributions. | Good in-distribution confidence behavior does not guarantee reliability on a new disaster or sensor. |
| **BayeSiamMTL**, Hertel et al., 2025 [7]. [Institutional paper](https://elib.dlr.de/215999/1/1-s2.0-S1569843225004066-main.pdf) | Establishes that uncertainty-aware multitask disaster assessment is already prior art; the proposed contribution must go beyond simply adding Bayesian machinery to a Siamese network. | Its published experiments are external results, not a head-to-head evaluation conducted by this project. |
| **xView2 deployment code** [29]. [Official repository](https://github.com/DIUx-xView/xView2-deploy) | Identifies the public predictor/fixture source used in the manuscript's post-processing pilot. | Stored predictor outputs without matched labels establish pipeline behavior, not accuracy or calibration. |

## Research gap addressed by the manuscript

The manuscript brings together four concerns: event-wise leakage prevention, validation-only calibration, ordinal severity risk and a separate uncertainty-driven review queue. Its claim is about this decision-support protocol and its auditable evidence boundaries. It does not establish superiority over BayeSiamMTL, BIT, U-Net or other baselines, because the proposed comparative experiment was not run.

The practical distinction is between **damage-risk triage** and **analyst-review triage**. Neither becomes a rescue routing or resource-allocation solution without additional validated operational data. Road obstruction, team availability and people at risk remain outside the satellite-only formulation.
