# Research work

Reading companion to **Uncertainty-Aware Satellite Imaging for Disaster Damage Assessment and Rescue Prioritization**, by Prabhmannat Singh, Atharva Pratap Singh Chundawat, Srijan Sachdeva and Yogiraj Bhale, AIT-CSE, Chandigarh University.

These notes summarize the six-page manuscript supplied by the repository owner, `Updated Research Paper (2).pdf`. They explain its methods and evidence status alongside the implemented application. They do not add training runs or turn proposed experiments into measured results. The complete PDF is not redistributed here; the requested figure crops are included with provenance.

## Reading order

| Document | Question it answers |
|---|---|
| [Literature](literature.md) | What earlier work motivates the study? |
| [Methodology](methodology.md) | How do the proposed model, uncertainty and priority formulas work? |
| [Experiments](experiments.md) | How should the full study be evaluated? |
| [Results and limitations](results-and-limitations.md) | What was actually reported, and what remains unvalidated? |
| [Software guide](software-guide.md) | What does the running application implement? |
| [Reproducibility](reproducibility.md) | Which artifacts and clarifications are required to reproduce the research? |
| [References](references.bib) | How can the manuscript and selected related work be cited? |
| [Figures](figures/README.md) | Where did the architecture and Joplin images come from? |

## The contribution in one paragraph

The proposed framework uses paired observations to estimate building damage, qualifies predictions through uncertainty and calibration, and separates conservative damage-risk prioritization from analyst-review prioritization. It calls for disaster-event-separated evaluation so nearby or related imagery cannot inflate apparent generalization. The default application demonstrates assessment and handoff using a simpler image-change heuristic; it does not implement the complete proposed probabilistic pipeline.

## Evidence labels

- **Proposed / registered:** the full Siamese model, MC-dropout study, calibration, baselines and ablations described in the manuscript.
- **Reported pilot:** deterministic post-processing of stored public xView2 fixture scores; no matched reference labels.
- **Implemented software:** the heuristic, component-based zone score, source-aware demonstrations, reports and educational labs in this repository.
- **External result:** a number from another published study; not a new result of this project.

See the [main README](../README.md) for current software screenshots and both original-paper figure crops.
