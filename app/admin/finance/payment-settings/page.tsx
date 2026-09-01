import { redirect } from "next/navigation";

export default function PaymentSettingsRedirectPage() {
  redirect("/admin/finance/settings?tab=payment");
}
