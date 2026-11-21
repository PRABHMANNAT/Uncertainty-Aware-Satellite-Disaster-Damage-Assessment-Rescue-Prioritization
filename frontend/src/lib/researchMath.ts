// Educational calculators. The default priority formula mirrors scoring.py.
// Probability and validation examples never represent measured model results.
export type FourValues = [number, number, number, number];
export const DAMAGE_CLASSES = [
  "No damage",
  "Minor",
  "Major",
  "Destroyed",
] as const;
export const DEFAULT_WEIGHTS: FourValues = [0, 2, 3.5, 5];
export const EXPLAINER_STORAGE_KEY = "disasteriq.assessment-explainer.v1";

export function safeCount(value: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(100000, Math.trunc(value)))
    : 0;
}

// Match Python round(value, 2), including ties and binary floating-point
// representation, so the explainer agrees with the backend at half-cent ties.
export function roundPriorityScore(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  const high = view.getUint32(0, false);
  const low = view.getUint32(4, false);
  const exponent = ((high >>> 20) & 2047) - 1023;
  const significand =
    (BigInt(high & 1048575) << BigInt(32)) +
    BigInt(low) +
    (BigInt(1) << BigInt(52));
  const numerator = significand * BigInt(100);
  const denominator = BigInt(1) << BigInt(52 - exponent);
  let quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (
    remainder * BigInt(2) > denominator ||
    (remainder * BigInt(2) === denominator &&
      quotient % BigInt(2) !== BigInt(0))
  )
    quotient += BigInt(1);
  return Number(quotient) / 100;
}

export function calculatePriority(
  counts: FourValues,
  weights: FourValues = DEFAULT_WEIGHTS,
) {
  const cleaned = counts.map(safeCount) as FourValues;
  const safeWeights = weights.map((value) =>
    Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0,
  ) as FourValues;
  const total = cleaned.reduce((sum, count) => sum + count, 0);
  const contributions = cleaned.map(
    (count, index) => count * safeWeights[index],
  ) as FourValues;
  const weighted = contributions.reduce((sum, value) => sum + value, 0);
  const score = total ? roundPriorityScore((weighted / (total * 5)) * 100) : 0;
  const tier = !total
    ? "No data"
    : score >= 50
      ? "High"
      : score >= 20
        ? "Medium"
        : "Low";
  return {
    counts: cleaned,
    weights: safeWeights,
    total,
    weighted,
    contributions,
    score,
    tier,
  };
}

export function probabilitySummary(values: FourValues) {
  const nonnegative = values.map((value) =>
    Number.isFinite(value) ? Math.max(0, value) : 0,
  );
  const sum = nonnegative.reduce((total, value) => total + value, 0);
  if (!sum) return null;
  const probabilities = nonnegative.map((value) => value / sum) as FourValues;
  const sorted = probabilities
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value);
  const entropy =
    -probabilities.reduce(
      (total, value) => total + (value > 0 ? value * Math.log(value) : 0),
      0,
    ) / Math.log(4);
  return {
    probabilities,
    predictedClass: sorted[0].index,
    topProbability: sorted[0].value,
    margin: sorted[0].value - sorted[1].value,
    normalizedEntropy: Math.max(0, Math.min(1, entropy)),
  };
}

export const ILLUSTRATIVE_PROBABILITIES: FourValues[] = [
  [90, 6, 3, 1],
  [5, 88, 5, 2],
  [2, 7, 86, 5],
  [1, 3, 8, 88],
  [40, 30, 20, 10],
  [20, 35, 30, 15],
  [10, 25, 40, 25],
  [15, 20, 30, 35],
];

export function reviewCoverage(samples: FourValues[], threshold: number) {
  const summaries = samples
    .map(probabilitySummary)
    .filter(
      (value): value is NonNullable<ReturnType<typeof probabilitySummary>> =>
        value !== null,
    );
  const retained = summaries.filter(
    (value) => value.topProbability >= threshold,
  ).length;
  return {
    total: summaries.length,
    retained,
    review: summaries.length - retained,
    coverage: summaries.length ? retained / summaries.length : 0,
  };
}

export function classificationMetrics(input: number[][]) {
  if (input.length !== 4 || input.some((row) => row.length !== 4))
    throw new Error("A four-by-four confusion matrix is required.");
  const matrix = input.map((row) => row.map(safeCount));
  const total = matrix.flat().reduce((sum, value) => sum + value, 0);
  const correct = matrix.reduce((sum, row, index) => sum + row[index], 0);
  const classes = matrix.map((row, index) => {
    const tp = row[index];
    const support = row.reduce((sum, value) => sum + value, 0);
    const predicted = matrix.reduce((sum, other) => sum + other[index], 0);
    const fp = predicted - tp;
    const fn = support - tp;
    return {
      support,
      predicted,
      tp,
      fp,
      fn,
      precision: predicted ? tp / predicted : null,
      recall: support ? tp / support : null,
      f1: 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null,
      iou: tp + fp + fn ? tp / (tp + fp + fn) : null,
    };
  });
  const mean = (values: (number | null)[]) => {
    const valid = values.filter((value): value is number => value !== null);
    return valid.length
      ? valid.reduce((sum, value) => sum + value, 0) / valid.length
      : null;
  };
  return {
    matrix,
    total,
    correct,
    accuracy: total ? correct / total : null,
    macroF1: mean(classes.map((item) => item.f1)),
    meanIoU: mean(classes.map((item) => item.iou)),
    balancedAccuracy: mean(classes.map((item) => item.recall)),
    classes,
  };
}

export interface ExplainableZone {
  rank: number;
  priority_score: number;
  building_counts: {
    none: number;
    minor: number;
    major: number;
    destroyed: number;
  };
  confidence?: number | null;
}
export interface ExplainableAssessment {
  pair_id?: string | null;
  inference_mode: string;
  geo_available: boolean;
  geo_mode?: string;
  summary: {
    total_buildings: number;
    minor_pct: number;
    major_pct: number;
    destroyed_pct: number;
  };
  zones: ExplainableZone[];
}

export function parseAssessment(
  raw: string | null,
): ExplainableAssessment | null {
  if (!raw || raw.length > 250000) return null;
  try {
    const data = JSON.parse(raw) as ExplainableAssessment;
    const number = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) && value >= 0;
    const percent = (value: unknown) =>
      number(value) && (value as number) <= 100;
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.inference_mode !== "string" ||
      data.inference_mode.length > 100 ||
      !(data.pair_id == null || typeof data.pair_id === "string") ||
      !(data.geo_mode == null || ["image", "wgs84"].includes(data.geo_mode)) ||
      typeof data.geo_available !== "boolean" ||
      !data.summary ||
      !number(data.summary.total_buildings) ||
      ![
        data.summary.minor_pct,
        data.summary.major_pct,
        data.summary.destroyed_pct,
      ].every(percent) ||
      !Array.isArray(data.zones) ||
      data.zones.length > 1000
    )
      return null;
    if (
      !data.zones.every(
        (zone) =>
          zone &&
          Number.isInteger(zone.rank) &&
          zone.rank > 0 &&
          percent(zone.priority_score) &&
          zone.building_counts &&
          Object.values(zone.building_counts).length === 4 &&
          [
            zone.building_counts.none,
            zone.building_counts.minor,
            zone.building_counts.major,
            zone.building_counts.destroyed,
          ].every((value) => number(value) && Number.isSafeInteger(value)) &&
          (zone.confidence == null ||
            (number(zone.confidence) && zone.confidence <= 1)),
      )
    )
      return null;
    return {
      pair_id: data.pair_id,
      inference_mode: data.inference_mode,
      geo_available: data.geo_available,
      geo_mode: data.geo_mode,
      summary: {
        total_buildings: data.summary.total_buildings,
        minor_pct: data.summary.minor_pct,
        major_pct: data.summary.major_pct,
        destroyed_pct: data.summary.destroyed_pct,
      },
      zones: data.zones.map((zone) => ({
        rank: zone.rank,
        priority_score: zone.priority_score,
        building_counts: {
          none: zone.building_counts.none,
          minor: zone.building_counts.minor,
          major: zone.building_counts.major,
          destroyed: zone.building_counts.destroyed,
        },
        confidence: zone.confidence,
      })),
    };
  } catch {
    return null;
  }
}

export function percentLabel(value: number | null, digits = 1) {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}
