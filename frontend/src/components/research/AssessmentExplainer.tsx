import Link from "next/link";
import { useState } from "react";
import {
  calculatePriority,
  DAMAGE_CLASSES,
  type ExplainableAssessment,
  type FourValues,
} from "@/lib/researchMath";

export default function AssessmentExplainer({
  assessment,
  onClear,
}: {
  assessment: ExplainableAssessment | null;
  onClear: () => void;
}) {
  const [rank, setRank] = useState(1);
  const zone =
    assessment?.zones.find((item) => item.rank === rank) ??
    assessment?.zones[0];
  if (!assessment)
    return (
      <section className="research-section assessment-empty">
        <span className="lab-label">EXPLAIN A REAL ASSESSMENT</span>
        <h2>Bring the explanation back to your evidence.</h2>
        <p>
          Run an assessment, then choose “Explain this assessment” in the
          Analysis & handoff panel. The explorer will unpack its counts,
          priority scores and confidence availability.
        </p>
        <Link
          className="button primary"
          href="/?scene=mexico-earthquake_00000076&autostart=1"
        >
          Run the earthquake assessment
        </Link>
        <span className="lab-fineprint">
          Only a compact numerical snapshot is passed within this browser
          session. Satellite images and overlays are not stored by this feature.
        </span>
      </section>
    );
  const heuristic = assessment.inference_mode.startsWith("stub");
  const counts: FourValues = zone
    ? [
        zone.building_counts.none,
        zone.building_counts.minor,
        zone.building_counts.major,
        zone.building_counts.destroyed,
      ]
    : [0, 0, 0, 0];
  const calculated = calculatePriority(counts);
  const dominant = calculated.contributions.indexOf(
    Math.max(...calculated.contributions),
  );
  return (
    <section className="research-section">
      <div className="research-section-heading">
        <span className="lab-label">
          SAVED ASSESSMENT · REAL WORKSPACE OUTPUT
        </span>
        <h2>Why did this zone receive its priority?</h2>
        <p>
          These values come from your workspace snapshot. They are not the
          synthetic examples used by the other labs.
        </p>
      </div>
      <div className="assessment-facts">
        <div>
          <span>Scene</span>
          <strong>{assessment.pair_id ?? "Uploaded image pair"}</strong>
        </div>
        <div>
          <span>Method</span>
          <strong>
            {heuristic ? "Image-change heuristic" : assessment.inference_mode}
          </strong>
        </div>
        <div>
          <span>Scene-wide estimate</span>
          <strong>
            {assessment.summary.total_buildings.toLocaleString()} components
          </strong>
        </div>
        <div>
          <span>Location reference</span>
          <strong>
            {assessment.geo_available && assessment.geo_mode !== "image"
              ? "WGS84"
              : "Image coordinates"}
          </strong>
        </div>
      </div>
      {zone ? (
        <>
          <div className="assessment-zone-select">
            <label htmlFor="explain-zone">Inspect response zone</label>
            <select
              id="explain-zone"
              value={zone.rank}
              onChange={(event) => setRank(Number(event.target.value))}
            >
              {assessment.zones.map((item) => (
                <option key={item.rank} value={item.rank}>
                  Zone {item.rank} · score {item.priority_score.toFixed(2)}
                </option>
              ))}
            </select>
            <span className="research-status">
              {calculated.tier} relative severity
            </span>
          </div>
          <div className="lab-grid">
            <div className="contribution-panel saved-contributions">
              <h3>Severity contributions</h3>
              <div className="contribution-bars">
                {DAMAGE_CLASSES.map((label, index) => (
                  <div key={label}>
                    <span>{label}</span>
                    <div>
                      <i
                        className={`severity-${index}`}
                        style={{
                          width: `${calculated.weighted ? (calculated.contributions[index] / calculated.weighted) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <strong>
                      {counts[index]} × {calculated.weights[index]}
                    </strong>
                  </div>
                ))}
              </div>
              <p>
                {calculated.weighted
                  ? `${DAMAGE_CLASSES[dominant]} components contribute the most to the weighted numerator.`
                  : "No weighted damage contribution is present in this zone."}
              </p>
            </div>
            <div className="saved-score-explanation">
              <span>Backend priority score</span>
              <strong data-testid="saved-priority-score">
                {zone.priority_score.toFixed(2)}
                <small> / 100</small>
              </strong>
              <code>
                {calculated.weighted.toFixed(1)} / ({calculated.total} × 5) ×
                100
              </code>
              <p>
                The denominator is the worst-case weighted severity for the same
                number of components. Increasing the no-damage count lowers this
                relative score; it does not prove an area is safe.
              </p>
              {Math.abs(calculated.score - zone.priority_score) > 0.011 && (
                <p className="research-alert">
                  The saved score differs from the default formula. Check the
                  analysis configuration before interpreting the ranking.
                </p>
              )}
            </div>
          </div>
          <div className="research-callout">
            <h3>What does the confidence field tell us?</h3>
            <p>
              {zone.confidence == null
                ? "This zone has no prediction-confidence value. Entropy and calibrated correctness probabilities cannot be reconstructed from its class counts. Human review remains necessary."
                : `The reported value is ${(zone.confidence * 100).toFixed(1)}% mean predicted-class probability over building pixels. This is not evidence of calibration, a confidence interval, or a guarantee that the zone's structural assessment is correct.`}
            </p>
          </div>
        </>
      ) : (
        <div className="research-callout">
          <h3>No ranked zones in this snapshot</h3>
          <p>
            A lack of detected changes is not evidence of structural safety.
            Check scene coverage and source imagery.
          </p>
        </div>
      )}
      <div className="research-bottom-links">
        <Link className="button" href="/">
          Return to the assessment workspace
        </Link>
        <button className="button" onClick={onClear}>
          Clear saved snapshot
        </button>
      </div>
      <p className="lab-fineprint">
        Scene totals are measured before splitting into zones. Per-zone
        components can overlap at boundaries and should not be added to recreate
        the global total.
      </p>
    </section>
  );
}
