import { useState } from "react";
import Link from "next/link";
import Icon from "../Icon";

const STAGES = [
  {
    title: "Compare",
    icon: "image",
    question: "What changed between observations?",
    body: "Start with imagery of the same area before and after an event. Comparable scale, acquisition dates, image alignment, cloud cover and lighting all affect what can be concluded.",
    input: "Before + after satellite imagery",
    output: "An aligned image pair",
    caveat:
      "A visual change can also be a shadow, seasonal variation, cloud or registration error.",
    file: "backend/app/services/inference.py",
  },
  {
    title: "Detect",
    icon: "layers",
    question: "Which pixels suggest damage?",
    body: "The current heuristic matches global brightness, estimates a translation, measures RGB change, thresholds that change and removes small noisy regions. A configured trained-model adapter can instead return class predictions.",
    input: "Aligned image pair",
    output: "Pixel classes: background, no damage, minor, major, destroyed",
    caveat:
      "The heuristic detects change and cannot identify intact buildings. Its class labels are illustrative damage proxies, not validated structural diagnoses.",
    file: "backend/app/services/inference.py",
  },
  {
    title: "Summarize",
    icon: "grid",
    question: "How are scene and zone counts different?",
    body: "Connected pixels of the same class are counted as components. Counts are measured across the whole scene and within each response zone. A component spanning a zone boundary can contribute to more than one zone.",
    input: "Damage-class mask",
    output: "Scene-wide totals and per-zone component counts",
    caveat:
      "Scene-wide totals are used in the summary. Adding zone counts can double-count boundary-spanning components. Components are estimates, not verified building IDs.",
    file: "backend/app/services/scoring.py",
  },
  {
    title: "Qualify",
    icon: "info",
    question: "How much evidence supports the result?",
    body: "The PyTorch adapter can supply class-probability maps. Zone confidence is the mean predicted-class probability over building pixels. The heuristic and Docker paths do not supply those confidence values.",
    input: "Available model probabilities and source metadata",
    output: "Confidence availability and explicit interpretation limits",
    caveat:
      "A large probability does not establish calibration or correctness. The uncertainty lab explains concepts using synthetic distributions; it does not add uncertainty estimates to heuristic results.",
    file: "backend/app/services/scoring.py",
  },
  {
    title: "Prioritize",
    icon: "crosshair",
    question: "Why does one zone rank above another?",
    body: "The implemented score combines component counts with severity weights: no damage 0, minor 2, major 3.5 and destroyed 5. Dividing by the maximum possible severity keeps the score between 0 and 100.",
    input: "Per-zone counts by severity",
    output: "A deterministic relative-severity ranking",
    caveat:
      "The score does not estimate people at risk, route safety, travel time or team requirements. Those decisions need additional evidence and human judgement.",
    file: "backend/app/services/scoring.py",
  },
  {
    title: "Review",
    icon: "file",
    question: "How does the result reach a coordinator?",
    body: "The workspace renders ranked zones and a situation brief. Reports retain the imagery, overlay, counts, confidence availability and analyst notes. The narrator summarizes the ranking; it does not re-rank zones.",
    input: "Ranked zones + analyst observations",
    output: "An auditable field report and geographic/data exports",
    caveat:
      "Field verification is required before operational decisions. No end-to-end rescue outcome or validated performance improvement is claimed here.",
    file: "backend/app/services/report.py",
  },
] as const;
const REPO =
  "https://github.com/PRABHMANNAT/Uncertainty-Aware-Satellite-Disaster-Damage-Assessment-Rescue-Prioritization/blob/main/";

export default function ResearchMethod() {
  const [stage, setStage] = useState(0);
  const selected = STAGES[stage];
  return (
    <section className="research-section">
      <div className="research-section-heading">
        <span className="lab-label">IMPLEMENTED WORKFLOW</span>
        <h2>From satellite observations to a reviewable decision.</h2>
        <p>Select a stage to see its role, evidence, and limitations.</p>
      </div>
      <ol className="method-stages" aria-label="Research workflow stages">
        {STAGES.map((item, index) => (
          <li key={item.title}>
            <button
              onClick={() => setStage(index)}
              aria-pressed={stage === index}
            >
              <Icon name={item.icon} size={21} />
              <span>{item.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="method-explanation">
        <div className="method-explanation-main">
          <span className="neutral-badge">{selected.title}</span>
          <h3>{selected.question}</h3>
          <p>{selected.body}</p>
          <div className="method-io">
            <div>
              <span>INPUT</span>
              <strong>{selected.input}</strong>
            </div>
            <Icon name="chevron" size={17} />
            <div>
              <span>OUTPUT</span>
              <strong>{selected.output}</strong>
            </div>
          </div>
          <a
            className="research-source-link"
            href={REPO + selected.file}
            target="_blank"
            rel="noopener noreferrer"
          >
            Inspect the implementation
          </a>
        </div>
        <aside className="method-caveat">
          <Icon name="info" size={22} />
          <h4>Interpretation limit</h4>
          <p>{selected.caveat}</p>
        </aside>
      </div>
      <div className="research-bottom-links">
        <Link className="button" href="/demonstrations">
          Explore real-event demonstrations
        </Link>
        <Link className="button" href="/">
          Open the assessment workspace
        </Link>
      </div>
    </section>
  );
}
