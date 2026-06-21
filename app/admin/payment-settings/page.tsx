import { redirect } from "next/navigation";

export default function LegacyPaymentSettingsPage() {
  redirect("/admin/finance/payment-settings");
}
