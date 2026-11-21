import {
  calculatePriority,
  DAMAGE_CLASSES,
  DEFAULT_WEIGHTS,
  safeCount,
  type FourValues,
} from "@/lib/researchMath";

export default function PriorityLab({
  counts,
  setCounts,
  weights,
  setWeights,
}: {
  counts: FourValues;
  setCounts: (value: FourValues) => void;
  weights: FourValues;
  setWeights: (value: FourValues) => void;
}) {
  const result = calculatePriority(counts, weights);
  const published = weights.every(
    (weight, index) => weight === DEFAULT_WEIGHTS[index],
  );
  const comparison = calculatePriority([2, 2, 6, 10], weights);
  return (
    <section className="research-section">
      <div className="research-section-heading">
        <span className="lab-label">PRIORITY-SCORE LAB</span>
        <h2>See exactly what changes a zone’s priority.</h2>
        <p>
          Edit the estimated component counts. Default weights match the
          implemented score; weight changes stay in this educational lab.
        </p>
      </div>
      <div className="lab-grid">
        <div className="lab-controls">
          <div className="lab-subheading">
            <h3>Example zone</h3>
            <span className="neutral-badge">Editable example</span>
          </div>
          <div className="class-inputs">
            {DAMAGE_CLASSES.map((label, index) => (
              <label key={label}>
                <span>
                  <i className={`legend-swatch severity-${index}`} />
                  {label}
                </span>
                <input
                  aria-label={`${label} component count`}
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  value={counts[index]}
                  onChange={(event) =>
                    setCounts(
                      counts.map((count, position) =>
                        position === index
                          ? safeCount(Number(event.target.value))
                          : count,
                      ) as FourValues,
                    )
                  }
                />
              </label>
            ))}
          </div>
          <div className="lab-subheading weights-heading">
            <h3>Severity weights</h3>
            <button
              className="text-button"
              onClick={() => setWeights([...DEFAULT_WEIGHTS])}
            >
              Restore implementation weights
            </button>
          </div>
          <div className="weight-inputs">
            {DAMAGE_CLASSES.map((label, index) => (
              <label key={label}>
                <span>{label}</span>
                <input
                  type="number"
                  aria-label={`${label} severity weight`}
                  min="0"
                  max="5"
                  step="0.5"
                  value={weights[index]}
                  disabled={index === 0 || index === 3}
                  onChange={(event) =>
                    setWeights(
                      weights.map((weight, position) =>
                        position === index
                          ? Math.max(
                              0,
                              Math.min(5, Number(event.target.value) || 0),
                            )
                          : weight,
                      ) as FourValues,
                    )
                  }
                />
              </label>
            ))}
          </div>
          <p className="lab-fineprint">
            No-damage and destroyed weights remain 0 and 5. Custom weights do
            not change the backend or existing assessments.
          </p>
        </div>
        <div className="priority-result">
          <div className="lab-subheading">
            <span
              className={`research-status ${published ? "" : "experimental"}`}
            >
              {published ? "Implementation formula" : "What-if weights"}
            </span>
            <span
              className={`priority-badge ${result.tier.toLowerCase().replace(" ", "-")}`}
            >
              {result.tier}
            </span>
          </div>
          <div className="priority-score-display" aria-live="polite">
            <strong data-testid="priority-score">
              {result.score.toFixed(2)}
            </strong>
            <span>/ 100</span>
          </div>
          <p>
            {result.total
              ? `${result.total.toLocaleString()} estimated components in this example zone`
              : "No components supplied. A zero score here does not establish safety."}
          </p>
          <div
            className="priority-meter"
            role="img"
            aria-label={`Relative severity score: ${result.score.toFixed(2)} out of 100`}
          >
            <span style={{ width: `${result.score}%` }} />
          </div>
          <div className="score-formula">
            <span>Weighted severity / maximum possible severity × 100</span>
            <code>
              (
              {counts
                .map((count, index) => `${count} × ${weights[index]}`)
                .join(" + ")}
              ) / ({result.total} × 5) × 100
            </code>
            <strong>
              {result.total
                ? `${result.weighted.toFixed(1)} / ${result.total * 5} × 100 = ${result.score.toFixed(2)}`
                : "Not calculated: no components supplied."}
            </strong>
          </div>
          <div className="score-thresholds">
            <span>Low: below 20</span>
            <span>Medium: 20–49.99</span>
            <span>High: 50–100</span>
          </div>
        </div>
      </div>
      <div className="contribution-panel">
        <h3>Where the score comes from</h3>
        <div className="contribution-bars">
          {DAMAGE_CLASSES.map((label, index) => (
            <div key={label}>
              <span>{label}</span>
              <div>
                <i
                  className={`severity-${index}`}
                  style={{
                    width: `${result.weighted ? (result.contributions[index] / result.weighted) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>{result.contributions[index].toFixed(1)}</strong>
            </div>
          ))}
        </div>
        <p className="lab-fineprint">
          Bars show contributions to the numerator, in weighted-component units.
          They are not probabilities or confidence values.
        </p>
      </div>
      <div className="research-callout">
        <h3>Severity and scale answer different questions.</h3>
        <p>
          The comparison zone has 2 no-damage, 2 minor, 6 major and 10 destroyed
          components. Its score is{" "}
          <strong data-testid="comparison-score">
            {comparison.score.toFixed(2)}
          </strong>{" "}
          with the same weights. A smaller zone can rank higher because a larger
          share of its components are severely affected. Population,
          accessibility and rescue staffing are outside this score.
        </p>
      </div>
    </section>
  );
}
