export type AppMembershipSettingsData = {
  enabled: boolean;
  yearlyPrice: number;
  currency: string;
  durationDays: number;
  requireForAppAccess: boolean;
};

export const DEFAULT_APP_MEMBERSHIP_SETTINGS: AppMembershipSettingsData = {
  enabled: true,
  yearlyPrice: 1000,
  currency: "ETB",
  durationDays: 365,
  requireForAppAccess: true,
};

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function parseAppMembershipSettingsData(
  raw: unknown,
): AppMembershipSettingsData {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_APP_MEMBERSHIP_SETTINGS };
  }

  const data = raw as Record<string, unknown>;
  return {
    enabled: readBoolean(
      data.enabled ?? data.Enabled,
      DEFAULT_APP_MEMBERSHIP_SETTINGS.enabled,
    ),
    yearlyPrice: readNumber(
      data.yearlyPrice ?? data.yearly_price,
      DEFAULT_APP_MEMBERSHIP_SETTINGS.yearlyPrice,
    ),
    currency: readString(
      data.currency ?? data.Currency,
      DEFAULT_APP_MEMBERSHIP_SETTINGS.currency,
    ).toUpperCase(),
    durationDays: Math.max(
      1,
      Math.round(
        readNumber(
          data.durationDays ?? data.duration_days,
          DEFAULT_APP_MEMBERSHIP_SETTINGS.durationDays,
        ),
      ),
    ),
    requireForAppAccess: readBoolean(
      data.requireForAppAccess ?? data.require_for_app_access,
      DEFAULT_APP_MEMBERSHIP_SETTINGS.requireForAppAccess,
    ),
  };
}

export function mergeAppMembershipSettings(
  current: AppMembershipSettingsData,
  patch: Partial<AppMembershipSettingsData>,
): AppMembershipSettingsData {
  return {
    enabled: patch.enabled ?? current.enabled,
    yearlyPrice:
      patch.yearlyPrice !== undefined && Number.isFinite(patch.yearlyPrice)
        ? patch.yearlyPrice
        : current.yearlyPrice,
    currency: patch.currency?.trim().toUpperCase() || current.currency,
    durationDays:
      patch.durationDays !== undefined && patch.durationDays > 0
        ? Math.round(patch.durationDays)
        : current.durationDays,
    requireForAppAccess: patch.requireForAppAccess ?? current.requireForAppAccess,
  };
}

export function serializeAppMembershipSettings(
  settings: AppMembershipSettingsData,
): Record<string, unknown> {
  return {
    enabled: settings.enabled,
    yearlyPrice: settings.yearlyPrice,
    currency: settings.currency,
    durationDays: settings.durationDays,
    requireForAppAccess: settings.requireForAppAccess,
  };
}
