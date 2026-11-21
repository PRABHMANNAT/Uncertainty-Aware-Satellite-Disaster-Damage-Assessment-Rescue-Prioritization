import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Execute the same pure calculator module bundled by the application.
const source = fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/lib/researchMath.ts",
  ),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const math = {};
new Function("exports", code)(math);
const empty = () => Array.from({ length: 4 }, () => [0, 0, 0, 0]);
const close = (actual, expected) =>
  assert(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test("priority formula reproduces a worked severity example", () => {
  const result = math.calculatePriority([20, 10, 8, 2]);
  assert.equal(result.weighted, 58);
  assert.equal(result.total, 40);
  assert.equal(result.score, 29);
  assert.equal(result.tier, "Medium");
});
test("smaller, more severely affected example ranks higher", () =>
  assert.equal(math.calculatePriority([2, 2, 6, 10]).score, 75));
test("no observations are distinguished from a low-severity zone", () => {
  assert.equal(math.calculatePriority([0, 0, 0, 0]).tier, "No data");
  assert.equal(math.calculatePriority([10, 0, 0, 0]).tier, "Low");
});
test("damage class endpoints match the backend weights", () => {
  assert.equal(math.calculatePriority([0, 10, 0, 0]).score, 40);
  assert.equal(math.calculatePriority([0, 0, 10, 0]).score, 70);
  assert.equal(math.calculatePriority([0, 0, 0, 10]).score, 100);
});
test("priority tier boundaries are inclusive at 20 and 50", () => {
  assert.equal(math.calculatePriority([1, 1, 0, 0]).tier, "Medium");
  assert.equal(math.calculatePriority([1, 0, 0, 1]).tier, "High");
});
test("what-if weights alter the example without mutating implementation defaults", () => {
  assert.equal(math.calculatePriority([0, 10, 0, 0], [0, 1, 3.5, 5]).score, 20);
  assert.deepEqual(math.DEFAULT_WEIGHTS, [0, 2, 3.5, 5]);
});
test("non-finite and negative calculator counts do not create invalid scores", () => {
  assert.equal(math.calculatePriority([NaN, -2, Infinity, 2]).score, 100);
});
test("certain distribution has zero normalized entropy", () => {
  const result = math.probabilitySummary([1, 0, 0, 0]);
  close(result.normalizedEntropy, 0);
  assert.equal(result.topProbability, 1);
  assert.equal(result.margin, 1);
});
test("uniform distribution has unit normalized entropy and no margin", () => {
  const result = math.probabilitySummary([25, 25, 25, 25]);
  close(result.normalizedEntropy, 1);
  assert.equal(result.topProbability, 0.25);
  assert.equal(result.margin, 0);
});
test("probability normalization is scale-invariant", () => {
  const first = math.probabilitySummary([55, 25, 15, 5]);
  const second = math.probabilitySummary([0.55, 0.25, 0.15, 0.05]);
  first.probabilities.forEach((value, index) =>
    close(value, second.probabilities[index]),
  );
  close(first.normalizedEntropy, second.normalizedEntropy);
});
test("all-zero weights do not invent a probability distribution", () =>
  assert.equal(math.probabilitySummary([0, 0, 0, 0]), null));
test("increasing the illustrative review threshold reduces retained coverage", () => {
  assert.equal(
    math.reviewCoverage(math.ILLUSTRATIVE_PROBABILITIES, 0.25).retained,
    8,
  );
  assert.equal(
    math.reviewCoverage(math.ILLUSTRATIVE_PROBABILITIES, 0.9).review,
    7,
  );
  assert.equal(
    math.reviewCoverage(math.ILLUSTRATIVE_PROBABILITIES, 0.99).review,
    8,
  );
});
test("perfect classification has accuracy, F1, recall and IoU of one", () => {
  const result = math.classificationMetrics([
    [25, 0, 0, 0],
    [0, 25, 0, 0],
    [0, 0, 25, 0],
    [0, 0, 0, 25],
  ]);
  assert.equal(result.total, 100);
  assert.equal(result.accuracy, 1);
  assert.equal(result.macroF1, 1);
  assert.equal(result.meanIoU, 1);
  assert.equal(result.balancedAccuracy, 1);
});
test("empty confusion matrices have undefined rather than perfect metrics", () => {
  const result = math.classificationMetrics(empty());
  assert.equal(result.accuracy, null);
  assert.equal(result.macroF1, null);
  assert.equal(result.meanIoU, null);
});
test("precision and recall use prediction columns and reference rows respectively", () => {
  const matrix = empty();
  matrix[0][0] = 1;
  matrix[0][1] = 1;
  matrix[1][1] = 1;
  const result = math.classificationMetrics(matrix);
  close(result.accuracy, 2 / 3);
  assert.equal(result.classes[0].precision, 1);
  assert.equal(result.classes[0].recall, 0.5);
  assert.equal(result.classes[1].precision, 0.5);
  assert.equal(result.classes[1].recall, 1);
  close(result.macroF1, 2 / 3);
  assert.equal(result.meanIoU, 0.5);
});
test("completely incorrect but populated classes score zero", () => {
  const result = math.classificationMetrics([
    [0, 10, 0, 0],
    [0, 0, 10, 0],
    [0, 0, 0, 10],
    [10, 0, 0, 0],
  ]);
  assert.equal(result.accuracy, 0);
  assert.equal(result.macroF1, 0);
  assert.equal(result.meanIoU, 0);
});
test("absent classes have undefined precision and recall", () => {
  const result = math.classificationMetrics([
    [1, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  assert.equal(result.classes[1].precision, null);
  assert.equal(result.classes[1].recall, null);
});
test("malformed confusion matrix dimensions are rejected", () =>
  assert.throws(() => math.classificationMetrics([[1, 2]])));

function assessment() {
  return {
    pair_id: "sample",
    inference_mode: "stub-heuristic",
    geo_available: false,
    geo_mode: "image",
    summary: {
      total_buildings: 4,
      minor_pct: 25,
      major_pct: 25,
      destroyed_pct: 25,
    },
    zones: [
      {
        rank: 1,
        priority_score: 52.5,
        building_counts: { none: 1, minor: 1, major: 1, destroyed: 1 },
        confidence: null,
      },
    ],
  };
}
test("real workspace snapshot schema accepts unavailable confidence", () =>
  assert(math.parseAssessment(JSON.stringify(assessment()))));
test("snapshot schema rejects invalid probability and counts", () => {
  const first = assessment();
  first.zones[0].confidence = 1.1;
  assert.equal(math.parseAssessment(JSON.stringify(first)), null);
  const second = assessment();
  second.zones[0].building_counts.minor = -0.1;
  assert.equal(math.parseAssessment(JSON.stringify(second)), null);
});
test("malformed or oversized snapshots do not reach the result renderer", () => {
  assert.equal(math.parseAssessment("invalid"), null);
  assert.equal(math.parseAssessment(" ".repeat(250001)), null);
  const invalid = assessment();
  invalid.pair_id = { title: "Not a string" };
  assert.equal(math.parseAssessment(JSON.stringify(invalid)), null);
});

test("priority rounding matches Python's half-even and binary-float behavior", () => {
  assert.equal(math.roundPriorityScore(0.625), 0.62);
  assert.equal(math.roundPriorityScore(2.675), 2.67);
  assert.equal(math.roundPriorityScore(1.225), 1.23);
});
test("assessment snapshots retain numerical evidence without image payloads", () => {
  const raw = assessment();
  raw.mask_base64 = "should-not-survive";
  const result = math.parseAssessment(JSON.stringify(raw));
  assert(result);
  assert(!("mask_base64" in result));
});
