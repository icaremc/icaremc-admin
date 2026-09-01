export type ReferralSettingsData = {
  commissionPercent: number;
};

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettingsData = {
  commissionPercent: 20,
};

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function parseReferralSettingsData(raw: unknown): ReferralSettingsData {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_REFERRAL_SETTINGS };
  }

  const data = raw as Record<string, unknown>;
  const percent = readNumber(
    data.commissionPercent ?? data.commission_percent,
    DEFAULT_REFERRAL_SETTINGS.commissionPercent,
  );

  return {
    commissionPercent: Math.min(100, Math.max(0, Math.round(percent))),
  };
}

export function mergeReferralSettings(
  current: ReferralSettingsData,
  patch: Partial<ReferralSettingsData>,
): ReferralSettingsData {
  const next =
    patch.commissionPercent !== undefined && Number.isFinite(patch.commissionPercent)
      ? patch.commissionPercent
      : current.commissionPercent;

  return {
    commissionPercent: Math.min(100, Math.max(0, Math.round(next))),
  };
}

export function serializeReferralSettings(
  settings: ReferralSettingsData,
): Record<string, unknown> {
  return { commissionPercent: settings.commissionPercent };
}
