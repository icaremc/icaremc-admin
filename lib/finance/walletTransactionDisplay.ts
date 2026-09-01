import type { WalletTransaction } from "@/lib/types/finance";

export function isReferralCommissionTransaction(tx: Pick<WalletTransaction, "note" | "type">): boolean {
  const note = (tx.note ?? "").toLowerCase();
  return note.includes("referral commission") || note.includes("referral_commission");
}

export function walletTransactionTypeLabel(tx: Pick<WalletTransaction, "note" | "type">): string {
  if (isReferralCommissionTransaction(tx)) return "referral commission";
  return tx.type.replace(/_/g, " ");
}

export function walletTransactionAmount(tx: Pick<WalletTransaction, "amount">): number {
  const amount = Number(tx.amount);
  return Number.isFinite(amount) ? amount : 0;
}

export function isZeroAmountTransaction(tx: Pick<WalletTransaction, "amount">): boolean {
  return walletTransactionAmount(tx) === 0;
}
