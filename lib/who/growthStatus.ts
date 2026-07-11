import {
  whoBandAt,
  whoZFor,
  type ChildSex,
  type WhoIndicator,
} from "@/lib/who/whoZScore";

export type GrowthStatusLevel =
  | "normal"
  | "underweight"
  | "stunting"
  | "wasting"
  | "overweight"
  | "obesity"
  | "low"
  | "high"
  | "unknown";

export type GrowthMetricResult = {
  level: GrowthStatusLevel;
  zScore: number | null;
  progressPercent: number | null;
  value: number | null;
  min: number | null;
  median: number | null;
  max: number | null;
};

export const GROWTH_STATUS_LABELS: Record<GrowthStatusLevel, string> = {
  normal: "Normal",
  underweight: "Underweight",
  stunting: "Stunting",
  wasting: "Wasting",
  overweight: "Overweight",
  obesity: "Obesity",
  low: "Below range",
  high: "Above range",
  unknown: "No reference",
};

const UNDER_Z = -2;
const OVERWEIGHT_Z = 1;
const OBESITY_Z = 2;

function fromZ(params: {
  z: number | null;
  value: number | null;
  min: number | null;
  median: number | null;
  max: number | null;
  belowNeg2: GrowthStatusLevel;
  abovePos1?: GrowthStatusLevel;
  abovePos2?: GrowthStatusLevel;
  useOverweightBand?: boolean;
}): GrowthMetricResult {
  const {
    z,
    value,
    min,
    median,
    max,
    belowNeg2,
    abovePos1 = "overweight",
    abovePos2 = "obesity",
    useOverweightBand = true,
  } = params;

  if (z == null && value == null) {
    return {
      level: "unknown",
      zScore: null,
      progressPercent: null,
      value: null,
      min: null,
      median: null,
      max: null,
    };
  }

  if (z == null) {
    return {
      level: "unknown",
      zScore: null,
      progressPercent: null,
      value,
      min,
      median,
      max,
    };
  }

  const progress =
    median != null && median > 0 && value != null
      ? (value / median) * 100
      : null;

  let level: GrowthStatusLevel = "normal";
  if (z < UNDER_Z) {
    level = belowNeg2;
  } else if (z > OBESITY_Z) {
    level = abovePos2;
  } else if (useOverweightBand && z > OVERWEIGHT_Z) {
    level = abovePos1;
  }

  return {
    level,
    zScore: z,
    progressPercent: progress,
    value,
    min,
    median,
    max,
  };
}

function metricFor(params: {
  indicator: WhoIndicator;
  sex: ChildSex;
  given: number;
  measurement: number | null | undefined;
  belowNeg2: GrowthStatusLevel;
  abovePos1?: GrowthStatusLevel;
  abovePos2?: GrowthStatusLevel;
  useOverweightBand?: boolean;
}): GrowthMetricResult {
  if (params.measurement == null) {
    return {
      level: "unknown",
      zScore: null,
      progressPercent: null,
      value: null,
      min: null,
      median: null,
      max: null,
    };
  }

  const band = whoBandAt({
    indicator: params.indicator,
    sex: params.sex,
    given: params.given,
  });
  const z = whoZFor({
    indicator: params.indicator,
    sex: params.sex,
    given: params.given,
    measurement: params.measurement,
  });

  return fromZ({
    z,
    value: params.measurement,
    min: band.low,
    median: band.median,
    max: band.high,
    belowNeg2: params.belowNeg2,
    abovePos1: params.abovePos1,
    abovePos2: params.abovePos2,
    useOverweightBand: params.useOverweightBand,
  });
}

export function weightForAge(params: {
  sex: ChildSex;
  ageMonths: number;
  weightKg: number | null | undefined;
}): GrowthMetricResult {
  return metricFor({
    indicator: "wfa",
    sex: params.sex,
    given: params.ageMonths,
    measurement: params.weightKg,
    belowNeg2: "underweight",
    abovePos1: "overweight",
    abovePos2: "overweight",
    useOverweightBand: false,
  });
}

export function heightForAge(params: {
  sex: ChildSex;
  ageMonths: number;
  heightCm: number | null | undefined;
}): GrowthMetricResult {
  return metricFor({
    indicator: "hfa",
    sex: params.sex,
    given: params.ageMonths,
    measurement: params.heightCm,
    belowNeg2: "stunting",
    abovePos1: "high",
    abovePos2: "high",
    useOverweightBand: false,
  });
}

export function headCircumferenceForAge(params: {
  sex: ChildSex;
  ageMonths: number;
  value: number | null | undefined;
}): GrowthMetricResult {
  return metricFor({
    indicator: "hca",
    sex: params.sex,
    given: params.ageMonths,
    measurement: params.value,
    belowNeg2: "low",
    abovePos1: "high",
    abovePos2: "high",
    useOverweightBand: false,
  });
}

export function isGrowthConcern(level: GrowthStatusLevel): boolean {
  return (
    level === "underweight" ||
    level === "stunting" ||
    level === "wasting" ||
    level === "overweight" ||
    level === "obesity" ||
    level === "low" ||
    level === "high"
  );
}

export function growthStatusTone(
  level: GrowthStatusLevel,
): "ok" | "warn" | "bad" | "muted" {
  if (level === "normal") return "ok";
  if (level === "unknown") return "muted";
  if (level === "overweight" || level === "high" || level === "low") {
    return "warn";
  }
  return "bad";
}
