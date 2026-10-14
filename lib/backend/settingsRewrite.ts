/** OpenAPI Put Setting: PUT /api/v1/admin/settings/{id} with body { data }. */

const SETTINGS_ADMIN_HEADS = new Set([
  "app-version-settings",
  "finance-settings",
  "payment-settings",
  "app-membership-settings",
  "referral-settings",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSettingsAdminPath(adminPath: string): boolean {
  const head = adminPath.replace(/^\/+/, "").split("/")[0] ?? "";
  return SETTINGS_ADMIN_HEADS.has(head);
}

export function rewriteSettingsPutBody(parsed: unknown): { data: unknown } {
  if (!isPlainObject(parsed)) return { data: parsed };
  const data =
    parsed.financeSettings ??
    parsed.paymentSettings ??
    parsed.appMembershipSettings ??
    parsed.referralSettings ??
    parsed.appVersionSettings ??
    parsed.data ??
    parsed;
  return { data };
}

export function shouldRewriteSettingsMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === "PATCH" || upper === "PUT";
}
