# Figures from the supplied research paper

Source manuscript: **Uncertainty-Aware Satellite Imaging for Disaster Damage Assessment and Rescue Prioritization**, supplied as `Updated Research Paper (2).pdf`.

Authors: **Prabhmannat Singh, Atharva Pratap Singh Chundawat, Srijan Sachdeva and Yogiraj Bhale**, AIT-CSE, Chandigarh University.

| File | Source | Capture |
|---|---|---|
| [figure-1-architecture.png](figure-1-architecture.png) | Figure 1, page 3 | Tight crop of the proposed architecture diagram body. The documentation supplies its caption and interpretation boundary. |
| [figure-2-joplin-pilot.png](figure-2-joplin-pilot.png) | Figure 2, page 4 | Four-panel Joplin pilot figure, original interpretation note and caption. |

Both are direct PDF page renders at 216 dpi. They are not redrawn diagrams, AI-generated illustrations or screenshots of newly computed software results. Figure 1 describes the proposed framework. Figure 2 derives from public xView2 deployment-fixture outputs as reported by the manuscript; it does not establish ground-truth accuracy, road access or rescue benefit.

The original PDF is not republished here. Its SHA-256 is `9328d2d6711df8d5f59b8ee6d2e49dee74b0b7c2620811a0d7e1e27cdad0130e`. Crop coordinates, output dimensions and output hashes are in [provenance.json](provenance.json). The [extraction script](../tools/extract_figures.py) accepts the source PDF as a local argument.

The figures retain their manuscript attribution and underlying imagery/provider rights. The repository's Apache source-code license does not grant additional rights over third-party satellite imagery, marks or manuscript material. Figure 2's upstream deployment source is [DIUx-xView/xView2-deploy](https://github.com/DIUx-xView/xView2-deploy). See the source manuscript's reference [29] and [NOTICE](../../NOTICE).
