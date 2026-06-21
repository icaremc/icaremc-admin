export type ChapaPaymentSettings = {
  name: string;
  enable: boolean;
  isActive: boolean;
  isSandbox: boolean;
  publicKey: string;
  secretKey: string;
  feePercent: number;
};

export type PaymentSettingsData = {
  chapa?: ChapaPaymentSettings;
};

function parseObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
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

export function defaultChapaSettings(): ChapaPaymentSettings {
  return {
    name: "Chapa",
    enable: false,
    isActive: false,
    isSandbox: false,
    publicKey: "",
    secretKey: "",
    feePercent: 3.5,
  };
}

export function parsePaymentSettingsData(raw: unknown): PaymentSettingsData {
  const root = parseObject(raw);
  const chapaRaw = parseObject(root.chapa);
  if (Object.keys(chapaRaw).length === 0) {
    return { chapa: defaultChapaSettings() };
  }

  return {
    chapa: {
      name: readString(chapaRaw.name, "Chapa"),
      enable: readBoolean(chapaRaw.enable),
      isActive: readBoolean(chapaRaw.isActive),
      isSandbox: readBoolean(chapaRaw.isSandbox),
      publicKey: readString(chapaRaw.publicKey),
      secretKey: readString(chapaRaw.secretKey),
      feePercent: readNumber(chapaRaw.feePercent, 3.5),
    },
  };
}

export function mergePaymentSettings(
  existing: PaymentSettingsData,
  patch: PaymentSettingsData,
): PaymentSettingsData {
  const current = existing.chapa ?? defaultChapaSettings();
  const next = patch.chapa ?? current;
  return {
    chapa: {
      ...current,
      ...next,
      enable: Boolean(next.enable),
      isActive: Boolean(next.isActive),
      isSandbox: Boolean(next.isSandbox),
      feePercent: readNumber(next.feePercent, current.feePercent),
    },
  };
}
