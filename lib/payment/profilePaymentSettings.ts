export type ProfilePaymentSettingId = "pregnancy_payment" | "child_payment";

export type ProfilePaymentSettings = {
  amount: number;
  currency: string;
  isActive: boolean;
  description: string;
};

const DEFAULTS: Record<ProfilePaymentSettingId, ProfilePaymentSettings> = {
  pregnancy_payment: {
    amount: 500,
    currency: "ETB",
    isActive: true,
    description: "Pregnancy profile registration and activation fee",
  },
  child_payment: {
    amount: 500,
    currency: "ETB",
    isActive: true,
    description: "Child profile registration and activation fee",
  },
};

function parseObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return (JSON.parse(value) as Record<string, unknown>) ?? {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function defaultProfilePaymentSettings(
  id: ProfilePaymentSettingId,
): ProfilePaymentSettings {
  return { ...DEFAULTS[id] };
}

export function parseProfilePaymentSettings(
  raw: unknown,
  id: ProfilePaymentSettingId,
): ProfilePaymentSettings {
  const root = parseObject(raw);
  const defaults = defaultProfilePaymentSettings(id);
  return {
    amount: readNumber(root.amount, defaults.amount),
    currency:
      typeof root.currency === "string" && root.currency.trim()
        ? root.currency.trim()
        : defaults.currency,
    isActive: readBoolean(root.isActive ?? root.is_active, defaults.isActive),
    description:
      typeof root.description === "string"
        ? root.description
        : defaults.description,
  };
}

export function mergeProfilePaymentSettings(
  existing: ProfilePaymentSettings,
  patch: Partial<ProfilePaymentSettings>,
): ProfilePaymentSettings {
  return {
    amount: readNumber(patch.amount, existing.amount),
    currency:
      typeof patch.currency === "string" && patch.currency.trim()
        ? patch.currency.trim()
        : existing.currency,
    isActive: patch.isActive ?? existing.isActive,
    description:
      typeof patch.description === "string"
        ? patch.description
        : existing.description,
  };
}

export function isProfilePaymentSettingId(
  value: string,
): value is ProfilePaymentSettingId {
  return value === "pregnancy_payment" || value === "child_payment";
}
