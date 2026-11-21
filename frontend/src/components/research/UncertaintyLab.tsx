import {
  DAMAGE_CLASSES,
  ILLUSTRATIVE_PROBABILITIES,
  percentLabel,
  probabilitySummary,
  reviewCoverage,
  type FourValues,
} from "@/lib/researchMath";

export default function UncertaintyLab({
  values,
  setValues,
  threshold,
  setThreshold,
}: {
  values: FourValues;
  setValues: (value: FourValues) => void;
  threshold: number;
  setThreshold: (value: number) => void;
}) {
  const summary = probabilitySummary(values);
  const workload = reviewCoverage(ILLUSTRATIVE_PROBABILITIES, threshold);
  const review = !summary || summary.topProbability < threshold;
  return (
    <section className="research-section">
      <div className="research-section-heading">
        <span className="lab-label">UNCERTAINTY LAB · SYNTHETIC DATA</span>
        <h2>A confident prediction can still be wrong.</h2>
        <p>
          Explore the shape of a four-class probability distribution. These
          editable inputs are educational examples, not predictions from an
          event.
        </p>
      </div>
      <div className="preset-buttons">
        <button className="button" onClick={() => setValues([90, 6, 3, 1])}>
          Clear signal example
        </button>
        <button className="button" onClick={() => setValues([35, 30, 20, 15])}>
          Ambiguous example
        </button>
        <button className="button" onClick={() => setValues([25, 25, 25, 25])}>
          Equal probabilities
        </button>
      </div>
      <div className="lab-grid">
        <div className="lab-controls">
          <h3>Class weights</h3>
          <p className="lab-fineprint">
            Inputs are normalized to sum to 100%. All-zero inputs have no
            defined distribution.
          </p>
          <div className="probability-inputs">
            {DAMAGE_CLASSES.map((label, index) => (
              <label key={label}>
                <span>
                  <i className={`legend-swatch severity-${index}`} />
                  {label}
                </span>
                <input
                  aria-label={`${label} probability weight`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={values[index]}
                  onChange={(event) =>
                    setValues(
                      values.map((value, position) =>
                        position === index ? Number(event.target.value) : value,
                      ) as FourValues,
                    )
                  }
                />
                <output>
                  {summary ? percentLabel(summary.probabilities[index]) : "—"}
                </output>
              </label>
            ))}
          </div>
          <div
            className="probability-chart"
            role="img"
            aria-label={
              summary
                ? `Normalized class probabilities: ${summary.probabilities.map((value, index) => `${DAMAGE_CLASSES[index]} ${percentLabel(value)}`).join(", ")}`
                : "No probability distribution"
            }
          >
            {summary?.probabilities.map((value, index) => (
              <span
                key={index}
                className={`severity-${index}`}
                style={{ width: `${value * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div className="uncertainty-results">
          <div className="research-stat-row">
            <div>
              <span>Top class probability</span>
              <strong data-testid="top-probability">
                {summary ? percentLabel(summary.topProbability) : "—"}
              </strong>
              <small>
                {summary
                  ? summary.margin === 0
                    ? "Top class is tied"
                    : DAMAGE_CLASSES[summary.predictedClass]
                  : "No distribution"}
              </small>
            </div>
            <div>
              <span>Normalized entropy</span>
              <strong data-testid="normalized-entropy">
                {summary?.normalizedEntropy.toFixed(3) ?? "—"}
              </strong>
              <small>0: concentrated · 1: uniform</small>
            </div>
            <div>
              <span>Top-two margin</span>
              <strong>{summary ? percentLabel(summary.margin) : "—"}</strong>
              <small>A smaller gap suggests ambiguity</small>
            </div>
          </div>
          <div className="entropy-explanation">
            <code>H = −Σ pᵢ ln(pᵢ) / ln(4)</code>
            <p>
              Entropy describes dispersion across classes. It does not measure
              model accuracy, detect every out-of-distribution input, or by
              itself separate data uncertainty from model uncertainty.
            </p>
          </div>
          <a
            className="research-source-link"
            href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Entropy definition · SciPy documentation
          </a>
        </div>
      </div>
      <div className="review-policy-panel">
        <div>
          <span className="lab-label">ILLUSTRATIVE HUMAN-REVIEW RULE</span>
          <h3>What happens when the review threshold changes?</h3>
          <p>
            Flag an example if its top class probability is below the threshold.
            This demonstration does not modify operational rankings.
          </p>
          <label className="review-threshold">
            Review threshold <output>{percentLabel(threshold, 0)}</output>
            <input
              aria-label="Review probability threshold"
              type="range"
              min="0.25"
              max="0.99"
              step="0.01"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="review-policy-result" aria-live="polite">
          <span className={`research-status ${review ? "experimental" : ""}`}>
            {!summary
              ? "No usable distribution"
              : review
                ? "Flag for human review"
                : "Passes this example threshold"}
          </span>
          <strong data-testid="review-count">
            {workload.review} / {workload.total}
          </strong>
          <p>synthetic examples flagged for review</p>
          <span>
            {percentLabel(workload.coverage, 0)} retained by this rule · no
            accuracy claim
          </span>
        </div>
      </div>
      <details className="research-details">
        <summary>
          What “uncertainty-aware” means in the current implementation
        </summary>
        <p>
          The heuristic returns no class probabilities and no confidence
          interval. The optional PyTorch path exposes mean predicted-class
          probability for each zone, which is not a calibrated probability of
          correct building assessment. Calibration and independent validation
          would be needed to support stronger confidence claims. Entropy here is
          computed only for the synthetic inputs you edit; it is not retrofitted
          onto heuristic output.
        </p>
        <a
          href="https://scikit-learn.org/stable/modules/calibration.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Probability calibration · scikit-learn documentation
        </a>
      </details>
    </section>
  );
}
