import {
  classificationMetrics,
  DAMAGE_CLASSES,
  percentLabel,
  safeCount,
} from "@/lib/researchMath";

export const EXAMPLE_MATRIX = [
  [42, 5, 2, 1],
  [6, 30, 3, 1],
  [2, 4, 24, 5],
  [1, 1, 4, 29],
];

export default function ValidationLab({
  matrix,
  setMatrix,
}: {
  matrix: number[][];
  setMatrix: (value: number[][]) => void;
}) {
  const metrics = classificationMetrics(matrix);
  const update = (row: number, column: number, value: number) =>
    setMatrix(
      matrix.map((items, rowIndex) =>
        items.map((item, columnIndex) =>
          rowIndex === row && columnIndex === column ? safeCount(value) : item,
        ),
      ),
    );
  const max = Math.max(1, ...matrix.flat());
  return (
    <section className="research-section">
      <div className="research-section-heading">
        <span className="lab-label">
          VALIDATION LAB · USER-ENTERED EXAMPLES
        </span>
        <h2>Explain performance without inventing results.</h2>
        <p>
          Edit a confusion matrix to see accuracy, class precision and recall,
          F1, and intersection-over-union. The supplied matrix is synthetic and
          is not a measured result of this project.
        </p>
      </div>
      <div className="preset-buttons">
        <button
          className="button"
          onClick={() => setMatrix(EXAMPLE_MATRIX.map((row) => [...row]))}
        >
          Load example matrix
        </button>
        <button
          className="button"
          onClick={() =>
            setMatrix(
              DAMAGE_CLASSES.map((_, row) =>
                DAMAGE_CLASSES.map((_, column) => (row === column ? 25 : 0)),
              ),
            )
          }
        >
          Perfect example
        </button>
        <button
          className="button"
          onClick={() => setMatrix(DAMAGE_CLASSES.map(() => [0, 0, 0, 0]))}
        >
          Clear matrix
        </button>
      </div>
      <div className="validation-top">
        <div className="confusion-wrap">
          <div className="matrix-axis-caption">
            Rows = reference labels · Columns = predicted labels
          </div>
          <table className="confusion-matrix">
            <caption>Four-class confusion matrix · illustrative inputs</caption>
            <thead>
              <tr>
                <th scope="col">Reference / predicted</th>
                {DAMAGE_CLASSES.map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAMAGE_CLASSES.map((label, row) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {DAMAGE_CLASSES.map((predicted, column) => (
                    <td
                      key={predicted}
                      className={row === column ? "correct-cell" : "error-cell"}
                      style={{
                        backgroundColor:
                          row === column
                            ? `rgba(88, 132, 105, ${0.06 + (0.25 * matrix[row][column]) / max})`
                            : `rgba(190, 129, 98, ${0.02 + (0.18 * matrix[row][column]) / max})`,
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="1"
                        aria-label={`Reference ${label}, predicted ${predicted}`}
                        value={matrix[row][column]}
                        onChange={(event) =>
                          update(row, column, Number(event.target.value))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="validation-summary">
          <div>
            <span>Accuracy</span>
            <strong data-testid="validation-accuracy">
              {percentLabel(metrics.accuracy)}
            </strong>
            <small>
              {metrics.correct} correct / {metrics.total} entered observations
            </small>
          </div>
          <div>
            <span>Macro F1</span>
            <strong data-testid="validation-f1">
              {percentLabel(metrics.macroF1)}
            </strong>
            <small>Mean across classes with defined F1</small>
          </div>
          <div>
            <span>Mean IoU</span>
            <strong>{percentLabel(metrics.meanIoU)}</strong>
            <small>Mean across classes with defined IoU</small>
          </div>
        </div>
      </div>
      <div className="research-table-scroll">
        <table className="class-metrics-table">
          <caption>Per-class metrics from the entered confusion matrix</caption>
          <thead>
            <tr>
              <th scope="col">Class</th>
              <th scope="col">Reference count</th>
              <th scope="col">Precision</th>
              <th scope="col">Recall</th>
              <th scope="col">F1</th>
              <th scope="col">IoU</th>
            </tr>
          </thead>
          <tbody>
            {metrics.classes.map((item, index) => (
              <tr key={index}>
                <th scope="row">{DAMAGE_CLASSES[index]}</th>
                <td>{item.support}</td>
                <td>{percentLabel(item.precision)}</td>
                <td>{percentLabel(item.recall)}</td>
                <td>{percentLabel(item.f1)}</td>
                <td>{percentLabel(item.iou)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="metric-definitions">
        <div>
          <h3>Precision</h3>
          <code>TP / (TP + FP)</code>
          <p>
            Among predictions for a class, how many match its reference labels?
          </p>
        </div>
        <div>
          <h3>Recall</h3>
          <code>TP / (TP + FN)</code>
          <p>Among reference examples of a class, how many were recovered?</p>
        </div>
        <div>
          <h3>F1 & IoU</h3>
          <code>
            2TP / (2TP + FP + FN)
            <br />
            TP / (TP + FP + FN)
          </code>
          <p>Both account for false positives and missed examples.</p>
        </div>
      </div>
      <p className="lab-fineprint">
        Background pixels are excluded from this four-class building-damage matrix. A dash means a zero denominator. Undefined class scores are excluded
        from macro averages. Matrix entries must refer to the same unit of
        evaluation, such as pixels or independently matched buildings. Do not
        mix those units.
      </p>
      <details className="research-details">
        <summary>What is needed for a paper-quality evaluation?</summary>
        <p>
          Use held-out events and geographically disjoint train/test splits,
          document the reference labels and unit of evaluation, report per-class
          performance and uncertainty, and evaluate calibration on independent
          data. Any baseline comparison should use the same split and
          definitions. No experimental improvement, calibrated uncertainty
          interval, or rescue outcome is established by this calculator.
        </p>
        <a
          href="https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics"
          target="_blank"
          rel="noopener noreferrer"
        >
          Classification metrics · scikit-learn documentation
        </a>
      </details>
    </section>
  );
}
