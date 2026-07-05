import type { SupabaseClient } from "@supabase/supabase-js";
import { sendDoctorPush } from "@/lib/push/sendDoctorPush";
import type { PushDeliveryInput } from "@/lib/push/pushDelivery";

export type PayoutNotifyEvent =
  | "approved"
  | "rejected"
  | "completed"
  | "transfer_initiated";

function formatAmount(amount: number, currency: string): string {
  const normalized = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${normalized.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function payoutPushMessage(
  event: PayoutNotifyEvent,
  amount: number,
  currency: string,
): PushDeliveryInput {
  const formatted = formatAmount(amount, currency);

  switch (event) {
    case "approved":
      return {
        title: "Withdrawal approved",
        body: `Your withdrawal of ${formatted} was approved. Payment will be sent soon.`,
        route: "/wallet-history",
        type: "payout",
      };
    case "rejected":
      return {
        title: "Withdrawal rejected",
        body: `Your withdrawal of ${formatted} was rejected. Funds were returned to your wallet.`,
        route: "/wallet-history",
        type: "payout",
      };
    case "completed":
      return {
        title: "Withdrawal paid",
        body: `Your withdrawal of ${formatted} has been paid to your bank account.`,
        route: "/wallet-history",
        type: "payout",
      };
    case "transfer_initiated":
      return {
        title: "Payment processing",
        body: `Your withdrawal of ${formatted} is being sent to your bank account.`,
        route: "/wallet-history",
        type: "payout",
      };
  }
}

export async function notifyDoctorPayoutStatus(
  serviceClient: SupabaseClient,
  params: {
    doctorId: string;
    event: PayoutNotifyEvent;
    amount: number;
    currency?: string;
  },
): Promise<void> {
  const { doctorId, event, amount, currency = "ETB" } = params;
  if (!doctorId.trim()) return;

  await sendDoctorPush({
    serviceClient,
    userId: doctorId,
    input: payoutPushMessage(event, amount, currency),
  });
}
