export type FinanceSettings = {
  minimumAmountWithdraw: number;
  platformCommissionPercent: number;
  doctorCancelPenaltyEnabled: boolean;
  doctorCancelPenaltyAmount: number;
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

export function defaultFinanceSettings(): FinanceSettings {
  return {
    minimumAmountWithdraw: 500,
    platformCommissionPercent: 10,
    doctorCancelPenaltyEnabled: false,
    doctorCancelPenaltyAmount: 0,
  };
}

export function parseFinanceSettings(raw: unknown): FinanceSettings {
  const root = parseObject(raw);
  const defaults = defaultFinanceSettings();
  return {
    minimumAmountWithdraw: readNumber(
      root.minimumAmountWithdraw,
      defaults.minimumAmountWithdraw,
    ),
    platformCommissionPercent: readNumber(
      root.platformCommissionPercent,
      defaults.platformCommissionPercent,
    ),
    doctorCancelPenaltyEnabled: readBoolean(
      root.doctorCancelPenaltyEnabled,
      defaults.doctorCancelPenaltyEnabled,
    ),
    doctorCancelPenaltyAmount: readNumber(
      root.doctorCancelPenaltyAmount,
      defaults.doctorCancelPenaltyAmount,
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
    doctorCancelPenaltyEnabled:
      patch.doctorCancelPenaltyEnabled ?? existing.doctorCancelPenaltyEnabled,
    doctorCancelPenaltyAmount: readNumber(
      patch.doctorCancelPenaltyAmount,
      existing.doctorCancelPenaltyAmount,
    ),
  };
}
