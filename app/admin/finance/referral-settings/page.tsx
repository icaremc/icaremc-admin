import { redirect } from "next/navigation";

export default function ReferralSettingsRedirectPage() {
  redirect("/admin/referrals?tab=settings");
}
