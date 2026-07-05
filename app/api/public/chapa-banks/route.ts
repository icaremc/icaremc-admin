import { NextResponse } from "next/server";
import {
  fetchChapaBanks,
  loadChapaSettings,
  toErrorMessage,
} from "@/lib/finance/chapaPayout";

export const runtime = "nodejs";

export type PublicChapaBank = {
  id: number;
  slug: string;
  name: string;
  swift: string | null;
  acct_length: number | null;
  currency: string;
};

function mapPublicBank(bank: {
  id: number;
  slug?: string;
  name?: string;
  swift?: string;
  acct_length?: number;
  currency?: string;
  active?: number;
  is_active?: number;
}): PublicChapaBank | null {
  const isActive = bank.active === 1 || bank.is_active === 1;
  if (!isActive) return null;
  const currency = (bank.currency ?? "").toUpperCase();
  if (currency && currency !== "ETB") return null;

  return {
    id: bank.id,
    slug: bank.slug ?? "",
    name: bank.name ?? "",
    swift: bank.swift ?? null,
    acct_length:
      typeof bank.acct_length === "number" && bank.acct_length > 0
        ? bank.acct_length
        : null,
    currency: currency || "ETB",
  };
}

export async function GET() {
  try {
    const { enabled, secretKey } = await loadChapaSettings();
    if (!enabled) {
      return NextResponse.json(
        { error: "Chapa payouts are not enabled" },
        { status: 503 },
      );
    }
    if (!secretKey) {
      return NextResponse.json({ error: "Chapa is not configured" }, { status: 503 });
    }

    const banks = await fetchChapaBanks(secretKey);
    const etbBanks = banks
      .map((bank) =>
        mapPublicBank({
          id: bank.id,
          slug: bank.slug,
          name: bank.name,
          swift: bank.swift,
          acct_length: bank.acct_length,
          currency: bank.currency,
          active: bank.active,
          is_active: bank.is_active,
        }),
      )
      .filter((bank): bank is PublicChapaBank => bank !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { banks: etbBanks },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : toErrorMessage(error, "Failed to load banks") },
      { status: 500 },
    );
  }
}
