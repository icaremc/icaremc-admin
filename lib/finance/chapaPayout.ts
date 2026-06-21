import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  defaultChapaSettings,
  parsePaymentSettingsData,
  type ChapaPaymentSettings,
} from "@/lib/payment/paymentSettings";
import type { DoctorPayoutMethod } from "@/lib/types/finance";

export type ChapaBank = {
  id: number;
  slug?: string;
  swift?: string;
  name?: string;
  acct_length?: number;
  currency?: string;
  active?: number;
  is_active?: number;
  is_mobilemoney?: number | null;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

export function toErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function buildPayoutTxRef(requestId: string): string {
  const shortId = requestId.replace(/-/g, "").slice(0, 12);
  return `icare-wd-${shortId}-${Date.now()}`.slice(0, 50);
}

export function extractChapaReference(adminNote: string | null | undefined): string {
  const match = (adminNote ?? "").match(/reference=([A-Za-z0-9\-_]+)/);
  return match?.[1] ?? "";
}

export function hasChapaReference(adminNote: string | null | undefined): boolean {
  return extractChapaReference(adminNote).length > 0;
}

export function mapChapaTransferStatus(
  status: string,
): "completed" | "rejected" | "approved" {
  const normalized = status.toLowerCase();
  if (["success", "successful", "completed", "paid"].includes(normalized)) {
    return "completed";
  }
  if (
    ["failed", "failure", "cancelled", "canceled", "error", "reversed"].includes(
      normalized,
    )
  ) {
    return "rejected";
  }
  return "approved";
}

export async function loadChapaSettings(): Promise<{
  chapa: ChapaPaymentSettings;
  secretKey: string;
  enabled: boolean;
}> {
  const client = createServiceSupabaseClient();
  const { data } = await client
    .from("app_settings")
    .select("data")
    .eq("id", "payment")
    .maybeSingle();

  const parsed = parsePaymentSettingsData(data?.data ?? {});
  const chapa = parsed.chapa ?? defaultChapaSettings();
  const secretKey = (chapa.secretKey || process.env.CHAPA_SECRET_KEY || "").trim();
  const enabled =
    normalizeBoolean(chapa.enable) && normalizeBoolean(chapa.isActive ?? true);

  return { chapa, secretKey, enabled };
}

function normalizeBankLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isNumericText(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function pickPreferredBank(candidates: ChapaBank[]): ChapaBank | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const aMobile = (a.is_mobilemoney ?? 0) ? 1 : 0;
    const bMobile = (b.is_mobilemoney ?? 0) ? 1 : 0;
    return aMobile - bMobile;
  });
  return sorted[0];
}

export async function fetchChapaBanks(secretKey: string): Promise<ChapaBank[]> {
  const response = await fetch("https://api.chapa.co/v1/banks", {
    method: "GET",
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const payload = (await response.json()) as {
    data?: ChapaBank[];
    message?: unknown;
  };
  if (!response.ok) {
    throw new Error(toErrorMessage(payload.message, "Failed to fetch Chapa banks"));
  }
  return payload.data ?? [];
}

export async function resolveNumericBankCode(params: {
  secretKey: string;
  storedBankCode: string;
  swiftCode: string;
  bankName: string;
}): Promise<{ bankCode: string; bank: ChapaBank | null }> {
  const { secretKey, storedBankCode, swiftCode, bankName } = params;
  if (storedBankCode && isNumericText(storedBankCode)) {
    return { bankCode: storedBankCode, bank: null };
  }

  const banks = await fetchChapaBanks(secretKey);
  const etbBanks = banks.filter((bank) => {
    const isActive = bank.active === 1 || bank.is_active === 1;
    return (bank.currency ?? "").toUpperCase() === "ETB" && isActive;
  });

  const normalizedStoredCode = normalizeBankLabel(storedBankCode);
  const normalizedSwift = normalizeBankLabel(swiftCode);
  const normalizedBankName = normalizeBankLabel(bankName);

  const bySlug = normalizedStoredCode
    ? etbBanks.filter(
        (bank) => normalizeBankLabel(bank.slug ?? "") === normalizedStoredCode,
      )
    : [];
  const preferredBySlug = pickPreferredBank(bySlug);
  if (preferredBySlug) {
    return { bankCode: String(preferredBySlug.id), bank: preferredBySlug };
  }

  const bySwift = normalizedSwift
    ? etbBanks.filter(
        (bank) => normalizeBankLabel(bank.swift ?? "") === normalizedSwift,
      )
    : [];
  const preferredBySwift = pickPreferredBank(bySwift);
  if (preferredBySwift) {
    return { bankCode: String(preferredBySwift.id), bank: preferredBySwift };
  }

  const byName = normalizedBankName
    ? etbBanks.filter((bank) => {
        const bankLabel = normalizeBankLabel(bank.name ?? "");
        return (
          bankLabel === normalizedBankName ||
          bankLabel.includes(normalizedBankName) ||
          normalizedBankName.includes(bankLabel)
        );
      })
    : [];
  const preferredByName = pickPreferredBank(byName);
  if (preferredByName) {
    return { bankCode: String(preferredByName.id), bank: preferredByName };
  }

  throw new Error(`Unable to resolve numeric bank code for bank "${bankName}"`);
}

export function normalizeAccountNumber(value: string): string {
  return value.replace(/\s+/g, "");
}

export function isDigitsOnly(value: string): boolean {
  return /^\d+$/.test(value);
}

export function appendAdminNote(
  existing: string | null | undefined,
  line: string,
): string {
  const current = normalizeText(existing);
  return current ? `${current}\n${line}` : line;
}

export async function getDoctorPayoutMethod(
  payoutMethodId: string | null,
): Promise<DoctorPayoutMethod | null> {
  if (!payoutMethodId) return null;
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("doctor_payout_methods")
    .select("*")
    .eq("id", payoutMethodId)
    .maybeSingle();
  if (error || !data) return null;
  return data as DoctorPayoutMethod;
}

export function resolveWebhookUrl(request: Request): string {
  const configured = (
    process.env.CHAPA_TRANSFER_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).trim();

  if (configured.includes("/api/admin/payout-requests/chapa-webhook")) {
    return configured;
  }

  if (configured) {
    return `${configured.replace(/\/$/, "")}/api/admin/payout-requests/chapa-webhook`;
  }

  const origin = new URL(request.url).origin;
  return `${origin}/api/admin/payout-requests/chapa-webhook`;
}

export function maskAccountNumber(accountNumber?: string | null): string {
  const normalized = (accountNumber ?? "").trim();
  if (!normalized) return "—";
  if (normalized.length <= 4) return normalized;
  return `${"*".repeat(Math.max(normalized.length - 4, 2))}${normalized.slice(-4)}`;
}
