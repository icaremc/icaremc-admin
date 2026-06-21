export type FinanceSettings = {
  minimumAmountWithdraw: number;
  platformCommissionPercent: number;
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

export function defaultFinanceSettings(): FinanceSettings {
  return {
    minimumAmountWithdraw: 500,
    platformCommissionPercent: 10,
  };
}

export function parseFinanceSettings(raw: unknown): FinanceSettings {
  const root = parseObject(raw);
  return {
    minimumAmountWithdraw: readNumber(
      root.minimumAmountWithdraw,
      defaultFinanceSettings().minimumAmountWithdraw,
    ),
    platformCommissionPercent: readNumber(
      root.platformCommissionPercent,
      defaultFinanceSettings().platformCommissionPercent,
    ),
  };
}

export function mergeFinanceSettings(
  existing: FinanceSettings,
  patch: Partial<FinanceSettings>,
): FinanceSettings {
  return {
    minimumAmountWithdraw: readNumber(
      patch.minimumAmountWithdraw,
      existing.minimumAmountWithdraw,
    ),
    platformCommissionPercent: readNumber(
      patch.platformCommissionPercent,
      existing.platformCommissionPercent,
    ),
  };
}
