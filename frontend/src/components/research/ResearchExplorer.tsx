"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ResearchIdentity from "../ResearchIdentity";
import Icon from "../Icon";
import ResearchMethod from "./ResearchMethod";
import PriorityLab from "./PriorityLab";
import UncertaintyLab from "./UncertaintyLab";
import ValidationLab, { EXAMPLE_MATRIX } from "./ValidationLab";
import AssessmentExplainer from "./AssessmentExplainer";
import { RESEARCH_TITLE } from "@/lib/research";
import {
  calculatePriority,
  classificationMetrics,
  DEFAULT_WEIGHTS,
  EXPLAINER_STORAGE_KEY,
  parseAssessment,
  probabilitySummary,
  type ExplainableAssessment,
  type FourValues,
} from "@/lib/researchMath";

const SECTIONS = [
  {
    id: "method",
    label: "Method walkthrough",
    icon: "layers",
    detail: "Follow the evidence",
  },
  {
    id: "priority",
    label: "Priority-score lab",
    icon: "crosshair",
    detail: "Unpack the ranking",
  },
  {
    id: "uncertainty",
    label: "Uncertainty lab",
    icon: "info",
    detail: "Explore ambiguity",
  },
  {
    id: "validation",
    label: "Validation lab",
    icon: "grid",
    detail: "Understand the metrics",
  },
  {
    id: "assessment",
    label: "Explain an assessment",
    icon: "file",
    detail: "Read your real result",
  },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export default function ResearchExplorer() {
  const [section, setSection] = useState<SectionId>("method");
  const [ready, setReady] = useState(false);
  const [counts, setCounts] = useState<FourValues>([20, 10, 8, 2]);
  const [weights, setWeights] = useState<FourValues>([...DEFAULT_WEIGHTS]);
  const [probabilities, setProbabilities] = useState<FourValues>([
    55, 25, 15, 5,
  ]);
  const [threshold, setThreshold] = useState(0.7);
  const [matrix, setMatrix] = useState<number[][]>(
    EXAMPLE_MATRIX.map((row) => [...row]),
  );
  const [assessment, setAssessment] = useState<ExplainableAssessment | null>(
    null,
  );
  const [snapshotStatus, setSnapshotStatus] = useState("");

  useEffect(() => {
    setReady(true);
    const requested = new URLSearchParams(window.location.search).get(
      "section",
    );
    if (SECTIONS.some((item) => item.id === requested))
      setSection(requested as SectionId);
    if (
      new URLSearchParams(window.location.search).get("snapshot") ===
      "unavailable"
    ) {
      setSnapshotStatus(
        "The new assessment snapshot could not be passed through browser storage. No previous snapshot is shown.",
      );
      return;
    }
    try {
      const raw = sessionStorage.getItem(EXPLAINER_STORAGE_KEY);
      const parsed = parseAssessment(raw);
      setAssessment(parsed);
      if (raw && !parsed)
        setSnapshotStatus(
          "The saved snapshot is invalid or uses an unsupported format. Run a new assessment to load it here.",
        );
    } catch {
      setSnapshotStatus(
        "Browser session storage is unavailable. The educational labs remain available.",
      );
    }
  }, []);

  const selectSection = (id: SectionId) => {
    setSection(id);
    window.history.replaceState(null, "", `/research?section=${id}`);
  };
  const reset = () => {
    setCounts([20, 10, 8, 2]);
    setWeights([...DEFAULT_WEIGHTS]);
    setProbabilities([55, 25, 15, 5]);
    setThreshold(0.7);
    setMatrix(EXAMPLE_MATRIX.map((row) => [...row]));
  };
  const clear = () => {
    setAssessment(null);
    setSnapshotStatus("");
    try {
      sessionStorage.removeItem(EXPLAINER_STORAGE_KEY);
    } catch {
      /* The displayed snapshot is still cleared. */
    }
  };
  const download = () => {
    const content = {
      title: RESEARCH_TITLE,
      generated_at: new Date().toISOString(),
      guide_scope:
        "Implementation-backed explanation; no manuscript or validated experiment results are bundled.",
      educational_examples: {
        label:
          "Synthetic or user-entered examples, not measured project results",
        priority: calculatePriority(counts, weights),
        probability_distribution: probabilitySummary(probabilities),
        illustrative_review_threshold: threshold,
        validation: classificationMetrics(matrix),
      },
      workspace_snapshot: assessment,
      sources: [
        "backend/app/services/inference.py",
        "backend/app/services/scoring.py",
        "https://scikit-learn.org/stable/modules/calibration.html",
        "https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics",
        "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html",
      ],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "research-explanation.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="demo-page paper-page">
      <header className="demo-header">
        <ResearchIdentity />
        <nav>
          <Link href="/">Assessment workspace</Link>
          <Link href="/demonstrations">Demonstrations</Link>
          <span aria-current="page">Paper Explorer</span>
        </nav>
      </header>
      <main className="demo-main research-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">THE REASONING BEHIND THE RESULT</div>
            <h1>
              Explore the research<span className="heading-dot">.</span>
            </h1>
            <p>
              Interactive explanations of damage assessment, uncertainty, and
              response prioritization.
            </p>
          </div>
          <button className="button" onClick={download} disabled={!ready}>
            <Icon name="download" size={17} />
            Export explanation
          </button>
        </div>
        <div className="research-scope-note">
          <Icon name="info" size={18} />
          <p>
            This guide follows the implemented methods. Editable numerical
            examples are educational simulations. A manuscript and validated
            experimental results are not bundled with this project.
          </p>
        </div>
        <div className="research-layout" data-research-ready={ready}>
          <aside className="research-navigation">
            <nav aria-label="Paper Explorer sections" inert={!ready}>
              {SECTIONS.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={section === item.id}
                  onClick={() => selectSection(item.id)}
                >
                  <Icon name={item.icon} size={20} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  {item.id === "assessment" && assessment && (
                    <span
                      className="loaded-snapshot-indicator"
                      title="Assessment snapshot available"
                    >
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="research-navigation-footer">
              <span className="lab-label">YOUR WORKBENCH</span>
              <p>Inputs stay editable as you move between labs.</p>
              <button className="text-button" onClick={reset}>
                Reset educational examples
              </button>
            </div>
          </aside>
          <div className="panel research-content" inert={!ready}>
            {snapshotStatus && (
              <div className="research-alert" role="status">
                {snapshotStatus}
              </div>
            )}
            {section === "method" && <ResearchMethod />}
            {section === "priority" && (
              <PriorityLab
                counts={counts}
                setCounts={setCounts}
                weights={weights}
                setWeights={setWeights}
              />
            )}
            {section === "uncertainty" && (
              <UncertaintyLab
                values={probabilities}
                setValues={setProbabilities}
                threshold={threshold}
                setThreshold={setThreshold}
              />
            )}
            {section === "validation" && (
              <ValidationLab matrix={matrix} setMatrix={setMatrix} />
            )}
            {section === "assessment" && (
              <AssessmentExplainer assessment={assessment} onClear={clear} />
            )}
          </div>
        </div>
        <details className="research-details research-evidence-status">
          <summary>
            Implementation status, evidence, and research claims
          </summary>
          <div className="research-table-scroll">
            <table className="class-metrics-table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">What is implemented</th>
                  <th scope="col">What this guide does not establish</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Damage analysis</th>
                  <td>
                    Image-change heuristic; optional Docker and PyTorch adapters
                  </td>
                  <td>
                    A trained checkpoint or measured structural-assessment
                    accuracy
                  </td>
                </tr>
                <tr>
                  <th scope="row">Uncertainty</th>
                  <td>
                    Optional mean predicted-class probability in PyTorch mode;
                    explicit confidence availability
                  </td>
                  <td>
                    Calibrated probabilities, epistemic/aleatoric decomposition,
                    or confidence intervals
                  </td>
                </tr>
                <tr>
                  <th scope="row">Prioritization</th>
                  <td>Deterministic severity-weighted zone ranking</td>
                  <td>
                    Optimal rescue allocation, live route safety, casualties, or
                    response-time reduction
                  </td>
                </tr>
                <tr>
                  <th scope="row">Validation lab</th>
                  <td>Metrics computed from user-entered confusion matrices</td>
                  <td>
                    Paper experiment results, benchmark superiority, or
                    generalization to unseen disasters
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <footer className="workspace-footer">
          <span>Chandigarh University · Research demonstration platform</span>
          <a
            href="https://github.com/PRABHMANNAT/Uncertainty-Aware-Satellite-Disaster-Damage-Assessment-Rescue-Prioritization"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source code & methodology
          </a>
        </footer>
      </main>
    </div>
  );
}
