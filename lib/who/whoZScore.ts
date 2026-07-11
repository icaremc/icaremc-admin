export type WhoIndicator = "wfa" | "hfa" | "bfa" | "hca" | "wfh";
export type ChildSex = "male" | "female";

export type LmsPoint = {
  given: number;
  l: number;
  m: number;
  s: number;
};

type WhoLmsRaw = Record<string, unknown>;

let rawTables: WhoLmsRaw | null = null;
let loadPromise: Promise<void> | null = null;

export function isWhoLmsLoaded() {
  return rawTables != null;
}

export async function ensureWhoLmsLoaded(): Promise<void> {
  if (rawTables) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const response = await fetch("/who/who_lms.json");
    if (!response.ok) {
      throw new Error("Failed to load WHO LMS reference tables");
    }
    rawTables = (await response.json()) as WhoLmsRaw;
  })();

  try {
    await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export function loadWhoLmsFromMap(map: WhoLmsRaw) {
  rawTables = map;
}

function sexKey(sex: ChildSex) {
  return sex;
}

export function whoTable(
  indicator: WhoIndicator,
  sex: ChildSex,
): LmsPoint[] {
  if (!rawTables) return [];
  const block = rawTables[indicator];
  if (!block || typeof block !== "object") return [];
  const list = (block as Record<string, unknown>)[sexKey(sex)];
  if (!Array.isArray(list)) return [];

  return list
    .filter((row): row is number[] => Array.isArray(row) && row.length >= 4)
    .map((row) => ({
      given: Number(row[0]),
      l: Number(row[1]),
      m: Number(row[2]),
      s: Number(row[3]),
    }));
}

export function interpolateLms(
  points: LmsPoint[],
  given: number,
): LmsPoint | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0]!;
  if (given <= points[0]!.given) return points[0]!;
  if (given >= points[points.length - 1]!.given) {
    return points[points.length - 1]!;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (given >= a.given && given <= b.given) {
      if (b.given === a.given) return a;
      const t = (given - a.given) / (b.given - a.given);
      return {
        given,
        l: a.l + (b.l - a.l) * t,
        m: a.m + (b.m - a.m) * t,
        s: a.s + (b.s - a.s) * t,
      };
    }
  }
  return points[points.length - 1]!;
}

export function zScoreFromLms(params: {
  measurement: number;
  l: number;
  m: number;
  s: number;
}): number | null {
  const { measurement, l, m, s } = params;
  if (measurement <= 0 || m <= 0 || s <= 0) return null;
  if (Math.abs(l) < 1e-9) {
    return Math.log(measurement / m) / s;
  }
  const ratio = measurement / m;
  return (Math.pow(ratio, l) - 1) / (l * s);
}

export function valueAtZ(params: {
  z: number;
  l: number;
  m: number;
  s: number;
}): number | null {
  const { z, l, m, s } = params;
  if (m <= 0 || s <= 0) return null;
  if (Math.abs(l) < 1e-9) {
    return m * Math.exp(s * z);
  }
  const inside = 1 + l * s * z;
  if (inside <= 0) return null;
  return m * Math.pow(inside, 1 / l);
}

export function whoZFor(params: {
  indicator: WhoIndicator;
  sex: ChildSex;
  given: number;
  measurement: number;
}): number | null {
  const lms = interpolateLms(whoTable(params.indicator, params.sex), params.given);
  if (!lms) return null;
  return zScoreFromLms({
    measurement: params.measurement,
    l: lms.l,
    m: lms.m,
    s: lms.s,
  });
}

export function whoBandAt(params: {
  indicator: WhoIndicator;
  sex: ChildSex;
  given: number;
  lowZ?: number;
  highZ?: number;
}): { low: number | null; median: number | null; high: number | null } {
  const lowZ = params.lowZ ?? -2;
  const highZ = params.highZ ?? 2;
  const lms = interpolateLms(whoTable(params.indicator, params.sex), params.given);
  if (!lms) return { low: null, median: null, high: null };
  return {
    low: valueAtZ({ z: lowZ, l: lms.l, m: lms.m, s: lms.s }),
    median: lms.m,
    high: valueAtZ({ z: highZ, l: lms.l, m: lms.m, s: lms.s }),
  };
}

/** Build a WHO reference curve (-2 / median / +2) across ages in months. */
export function whoReferenceSeries(params: {
  indicator: WhoIndicator;
  sex: ChildSex;
  maxAgeMonths: number;
  stepMonths?: number;
}): { ageMonths: number; low: number; median: number; high: number }[] {
  const step = params.stepMonths ?? 1;
  const maxAge = Math.max(0, Math.ceil(params.maxAgeMonths));
  const rows: { ageMonths: number; low: number; median: number; high: number }[] =
    [];

  for (let age = 0; age <= maxAge; age += step) {
    const band = whoBandAt({
      indicator: params.indicator,
      sex: params.sex,
      given: age,
    });
    if (band.low == null || band.median == null || band.high == null) continue;
    rows.push({
      ageMonths: age,
      low: band.low,
      median: band.median,
      high: band.high,
    });
  }
  return rows;
}
