/**
 * Maps admin app areas to staging Render API coverage.
 * When USE_BACKEND_API is on, unsupported areas show a staging message instead of Supabase.
 */

export type StagingCapability = {
  /** Admin UI path prefix, e.g. /admin/referrals */
  pathPrefix: string;
  label: string;
  /** null = not on staging API yet */
  backendHint: string | null;
};

export const STAGING_CAPABILITIES: StagingCapability[] = [
  { pathPrefix: "/admin/dashboard", label: "Dashboard", backendHint: "GET /api/v1/admin/dashboard" },
  {
    pathPrefix: "/admin/appointments",
    label: "Appointments",
    backendHint: "GET|PATCH /api/v1/admin/appointments (+ detail by id)",
  },
  {
    pathPrefix: "/admin/doctors",
    label: "Doctors",
    backendHint:
      "GET /api/v1/admin/doctors + services + wallet + booking write + verify/push",
  },
  {
    pathPrefix: "/admin/doctor-categories",
    label: "Speciality",
    backendHint: "GET|POST|PATCH|DELETE /api/v1/admin/doctor-categories",
  },
  { pathPrefix: "/admin/hospitals", label: "Hospitals", backendHint: "GET|POST|PATCH|DELETE /api/v1/admin/hospitals" },
  {
    pathPrefix: "/admin/users",
    label: "Parents",
    backendHint: "GET /api/v1/admin/users + GET /users/{id} + POST /push/notify",
  },
  { pathPrefix: "/admin/documents", label: "Internal docs", backendHint: "GET|POST /api/v1/admin/documents + deliver + delivery history" },
  {
    pathPrefix: "/admin/finance/payout-request",
    label: "Payout requests",
    backendHint: "GET|POST /api/v1/admin/payout-requests (detail via list)",
  },
  {
    pathPrefix: "/admin/finance/wallet-transactions",
    label: "Wallet transactions",
    backendHint: "GET /api/v1/admin/wallet-transactions",
  },
  {
    pathPrefix: "/admin/finance/app-membership",
    label: "App membership",
    backendHint: "GET|grant|revoke /api/v1/admin/membership + settings/subscription",
  },
  {
    pathPrefix: "/admin/finance/settings",
    label: "Finance settings",
    backendHint: "GET|PUT /api/v1/admin/settings/{id}",
  },
  {
    pathPrefix: "/admin/finance/payment",
    label: "Appointment payments",
    backendHint: "Via appointments list on staging API",
  },
  { pathPrefix: "/admin/admins", label: "Portal admins", backendHint: "GET|POST|PATCH /api/v1/admin/admins" },
  {
    pathPrefix: "/admin/activity",
    label: "Activity log",
    backendHint: "GET /api/v1/admin/activity-logs (+ admin/platform detail)",
  },
  { pathPrefix: "/admin/legal", label: "Policies", backendHint: "GET|PUT /api/v1/admin/legal-documents" },
  {
    pathPrefix: "/admin/about",
    label: "About the app",
    backendHint: "GET|PUT /api/v1/admin/legal-documents",
  },
  {
    pathPrefix: "/admin/app-version",
    label: "App release",
    backendHint: "GET|PUT /api/v1/admin/settings/app_version*",
  },
  {
    pathPrefix: "/admin/pregnancy-weeks",
    label: "Pregnancy weeks",
    backendHint:
      "GET|POST|PATCH|DELETE /api/v1/admin/pregnancy-weeks (+ translations, image via uploads)",
  },
  {
    pathPrefix: "/admin/child-growth/clinical-advice",
    label: "Clinical advice",
    backendHint: "GET|POST|PATCH|DELETE /api/v1/admin/clinical-advice (+ translations)",
  },
  {
    pathPrefix: "/admin/child-growth",
    label: "Child milestones",
    backendHint:
      "GET|POST|PATCH|DELETE /api/v1/admin/child-growth-periods (+ translations)",
  },
  {
    pathPrefix: "/admin/followup-visits",
    label: "Follow-up visits",
    backendHint: "GET|POST|PATCH|DELETE /api/v1/admin/followup-templates",
  },

  { pathPrefix: "/admin/referrals", label: "Referrals", backendHint: "GET /api/v1/admin/referrals + commissions + settings/referral" },
  {
    pathPrefix: "/admin/finance/referral-settings",
    label: "Referral settings",
    backendHint: "GET|PUT /api/v1/admin/settings/referral",
  },
  { pathPrefix: "/admin/children", label: "Children", backendHint: "GET /api/v1/admin/children (+ detail)" },
  {
    pathPrefix: "/admin/content",
    label: "Content CMS",
    backendHint: "GET|POST|PATCH|DELETE /api/v1/admin/daily-tips (+ translations)",
  },
  {
    pathPrefix: "/admin/push",
    label: "Broadcast push",
    backendHint: null,
  },
  { pathPrefix: "/admin/health-logs", label: "Health logs", backendHint: null },
  {
    pathPrefix: "/admin/finance/payment-settings",
    label: "Payment settings (legacy URL)",
    backendHint: "Use Finance settings → Payment gateway (settings/payment)",
  },
];

export function getStagingCapability(pathname: string): StagingCapability | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const matches = STAGING_CAPABILITIES.filter(
    (item) =>
      normalized === item.pathPrefix || normalized.startsWith(`${item.pathPrefix}/`),
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0] ?? null;
}

/** @deprecated Detail pages are synthesized from list endpoints when present. */
export function isStagingDetailUnsupported(_pathname: string): boolean {
  return false;
}

export function isStagingFeatureAvailable(pathname: string): boolean {
  const cap = getStagingCapability(pathname);
  if (!cap) return true;
  return cap.backendHint !== null;
}

export type MapAdminApiOptions = {
  method?: string;
  searchParams?: URLSearchParams;
};

/** Map /api/admin/... remainder → backend path or null if unsupported. */
export function mapAdminApiToBackend(
  adminPath: string,
  options: MapAdminApiOptions = {},
): string | null {
  const method = (options.method ?? "GET").toUpperCase();
  const path = adminPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);
  const head = segments[0] ?? "";
  const rest = segments.slice(1);

  switch (head) {
    case "dashboard":
      if (rest[0] === "analytics" || rest.length === 0) return "/api/v1/admin/dashboard";
      return null;
    case "appointments":
      if (rest.length === 0) return "/api/v1/admin/appointments";
      if (rest[0] === "stats") return "/api/v1/admin/appointments";
      if (rest.length === 1) {
        if (method === "GET") return `/api/v1/admin/appointments/${rest[0]}`;
        if (method === "PATCH") return `/api/v1/admin/appointments/${rest[0]}`;
      }
      return null;
    case "doctors":
      if (rest.length === 0) {
        if (method === "GET") return "/api/v1/admin/doctors";
        return null;
      }
      if (rest.length === 2 && rest[1] === "verify") {
        return `/api/v1/admin/doctors/${rest[0]}/verify`;
      }
      if (rest.length === 2 && rest[1] === "push") {
        if (method === "POST") return "/api/v1/push/notify";
        if (method === "GET") return "/api/v1/admin/doctors";
        return null;
      }
      if (rest.length === 2 && rest[1] === "document-deliveries") {
        if (method === "GET") {
          return `/api/v1/admin/doctors/${rest[0]}/document-deliveries`;
        }
        if (method === "POST") return "__document_deliver__";
        return null;
      }
      if (rest.length === 2 && rest[1] === "services") {
        if (method === "GET") return `/api/v1/admin/doctors/${rest[0]}/services`;
        return null;
      }
      if (rest.length === 2 && rest[1] === "referral-stats") {
        if (method === "GET") {
          return `/api/v1/admin/doctors/${rest[0]}/referral-stats`;
        }
        return null;
      }
      if (rest.length === 2 && rest[1] === "wallet") {
        if (method === "GET") return `/api/v1/admin/doctors/${rest[0]}/wallet`;
        return null;
      }
      if (rest.length === 2 && rest[1] === "booking") {
        if (method === "PATCH" || method === "PUT") {
          return `/api/v1/admin/doctors/${rest[0]}/booking`;
        }
        return null;
      }
      if (rest.length === 1) {
        // Prefer admin list + admin services (added upstream) over public doctor detail
        if (method === "GET") return "__doctor_detail__";
        if (method === "PATCH" || method === "POST") {
          return `/api/v1/admin/doctors/${rest[0]}/verify`;
        }
        return null;
      }
      return null;
    case "doctor-categories":
      if (rest.length === 0) return "/api/v1/admin/doctor-categories";
      if (rest.length === 1) return `/api/v1/admin/doctor-categories/${rest[0]}`;
      return null;
    case "hospitals":
      if (rest.length === 0) return "/api/v1/admin/hospitals";
      if (rest.length === 1) return `/api/v1/admin/hospitals/${rest[0]}`;
      return null;
    case "users":
      if (rest.length === 0) return "/api/v1/admin/users";
      if (rest.length === 2 && rest[1] === "push") {
        if (method === "POST") return "/api/v1/push/notify";
        if (method === "GET") return `/api/v1/admin/users/${rest[0]}`;
        return null;
      }
      if (rest.length === 1) return `/api/v1/admin/users/${rest[0]}`;
      return null;
    case "documents":
      if (rest.length === 0) {
        if (method === "GET" || method === "POST") return "/api/v1/admin/documents";
        return null;
      }
      if (rest.length === 2 && rest[1] === "deliver" && method === "POST") {
        return `/api/v1/admin/documents/${rest[0]}/deliver`;
      }
      return null;
    case "payout-requests":
      if (rest.length === 0) return "/api/v1/admin/payout-requests";
      if (rest.length === 1) {
        if (method === "GET") return "/api/v1/admin/payout-requests";
        if (method === "PATCH" || method === "POST") {
          return `/api/v1/admin/payout-requests/${rest[0]}`;
        }
        return null;
      }
      return null;
    case "wallet-transactions":
      return "/api/v1/admin/wallet-transactions";
    case "app-membership-members":
      if (rest.length === 0) return "/api/v1/admin/membership";
      if (rest[1] === "grant") return "/api/v1/admin/membership/grant";
      if (rest[1] === "revoke") {
        return `/api/v1/admin/membership/${rest[0]}/revoke`;
      }
      return null;
    case "app-membership-settings":
      return "/api/v1/admin/settings/subscription";
    case "finance-settings":
      return "/api/v1/admin/settings/finance";
    case "payment-settings":
      return "/api/v1/admin/settings/payment";
    case "app-version-settings": {
      const app = options.searchParams?.get("app");
      const rowId = app === "doctors" ? "app_version_doctors" : "app_version";
      return `/api/v1/admin/settings/${rowId}`;
    }
    case "admins":
      if (method === "GET" || method === "POST") return "/api/v1/admin/admins";
      if (method === "PATCH") return "__admin_patch__";
      return null;
    case "activity-logs":
      if (rest.length === 2) {
        return rest[0] === "platform"
          ? "/api/v1/admin/activity/platform"
          : "/api/v1/admin/activity/admin";
      }
      if (method !== "GET") return null;
      return "/api/v1/admin/activity-logs";
    case "activity":
      if (rest[0] === "log") return null;
      return "/api/v1/admin/activity/platform";
    case "legal-documents":
      if (method === "GET" || method === "PATCH" || method === "PUT") {
        return "/api/v1/admin/legal-documents";
      }
      return null;
    case "pregnancy-weeks":
      if (rest.length === 0) {
        if (method === "GET" || method === "POST") return "/api/v1/admin/pregnancy-weeks";
        return null;
      }
      if (rest.length === 1) {
        if (method === "PATCH") return `/api/v1/admin/pregnancy-weeks/${rest[0]}`;
        if (method === "DELETE") return `/api/v1/admin/pregnancy-weeks/${rest[0]}`;
        return null;
      }
      if (rest[1] === "translations" && method === "POST") {
        return `/api/v1/admin/pregnancy-weeks/${rest[0]}/translations`;
      }
      if (rest[1] === "image" && (method === "PATCH" || method === "DELETE")) {
        return "__pregnancy_week_image__";
      }
      return null;
    case "child-growth":
      if (rest[0] === "learning-path-images") {
        if (method === "POST") return "__learning_path_images__";
        return null;
      }
      if (rest.length === 0) {
        if (method === "GET" || method === "POST") {
          return "/api/v1/admin/child-growth-periods";
        }
        return null;
      }
      if (rest.length === 1) {
        if (method === "GET" || method === "PATCH") {
          return `/api/v1/admin/child-growth-periods/${rest[0]}`;
        }
        if (method === "DELETE") return `/api/v1/admin/child-growth-periods/${rest[0]}`;
        return null;
      }
      if (rest[1] === "translations" && method === "POST") {
        return `/api/v1/admin/child-growth-periods/${rest[0]}/translations`;
      }
      return null;
    case "clinical-advice":
      if (rest.length === 0) {
        if (method === "GET" || method === "POST") {
          return "/api/v1/admin/clinical-advice";
        }
        return null;
      }
      if (rest.length === 1) {
        if (method === "GET" || method === "PATCH") {
          return `/api/v1/admin/clinical-advice/${rest[0]}`;
        }
        if (method === "DELETE") return `/api/v1/admin/clinical-advice/${rest[0]}`;
        return null;
      }
      if (rest[1] === "translations" && method === "POST") {
        return `/api/v1/admin/clinical-advice/${rest[0]}/translations`;
      }
      return null;
    case "followup-visits":
      if (rest.length === 0) {
        if (method === "GET" || method === "POST") {
          return "/api/v1/admin/followup-templates";
        }
        return null;
      }
      if (rest.length === 1) {
        if (method === "PATCH") return `/api/v1/admin/followup-templates/${rest[0]}`;
        if (method === "DELETE") return `/api/v1/admin/followup-templates/${rest[0]}`;
        return null;
      }
      return null;
    case "referrals":
      if (method === "GET") return "/api/v1/admin/referrals";
      return null;
    case "referral-commissions":
      if (method === "GET") return "/api/v1/admin/referral-commissions";
      return null;
    case "referral-settings":
      return "/api/v1/admin/settings/referral";
    case "children":
      if (rest.length === 0 && method === "GET") return "/api/v1/admin/children";
      if (rest.length === 1 && method === "GET") return `/api/v1/admin/children/${rest[0]}`;
      return null;
    case "daily-tips":
      if (rest.length === 0) {
        if (method === "GET" || method === "POST") return "/api/v1/admin/daily-tips";
        return null;
      }
      if (rest.length === 1) {
        if (method === "GET" || method === "PATCH") {
          return `/api/v1/admin/daily-tips/${rest[0]}`;
        }
        if (method === "DELETE") return `/api/v1/admin/daily-tips/${rest[0]}`;
        return null;
      }
      if (rest[1] === "translations" && method === "POST") {
        return `/api/v1/admin/daily-tips/${rest[0]}/translations`;
      }
      return null;
    default:
      return null;
  }
}

/** Every /api/admin path we expect to map or explicitly 501. */
export const ADMIN_API_MAPPING_CASES: Array<{
  adminPath: string;
  backendPath: string | null;
  method?: string;
}> = [
  { adminPath: "dashboard/analytics", backendPath: "/api/v1/admin/dashboard" },
  { adminPath: "appointments", backendPath: "/api/v1/admin/appointments" },
  { adminPath: "appointments/stats", backendPath: "/api/v1/admin/appointments" },
  {
    adminPath: "appointments/a1",
    backendPath: "/api/v1/admin/appointments/a1",
    method: "GET",
  },
  {
    adminPath: "appointments/a1",
    backendPath: "/api/v1/admin/appointments/a1",
    method: "PATCH",
  },
  { adminPath: "children", backendPath: "/api/v1/admin/children", method: "GET" },
  { adminPath: "children/c1", backendPath: "/api/v1/admin/children/c1", method: "GET" },
  { adminPath: "children/c1", backendPath: null, method: "PATCH" },
  { adminPath: "doctors", backendPath: "/api/v1/admin/doctors" },
  { adminPath: "doctors/abc/verify", backendPath: "/api/v1/admin/doctors/abc/verify" },
  { adminPath: "doctors/abc", backendPath: "__doctor_detail__", method: "GET" },
  {
    adminPath: "doctors/abc/services",
    backendPath: "/api/v1/admin/doctors/abc/services",
    method: "GET",
  },
  {
    adminPath: "doctors/abc",
    backendPath: "/api/v1/admin/doctors/abc/verify",
    method: "PATCH",
  },
  {
    adminPath: "doctors/abc/push",
    backendPath: "/api/v1/push/notify",
    method: "POST",
  },
  {
    adminPath: "doctors/abc/wallet",
    backendPath: "/api/v1/admin/doctors/abc/wallet",
    method: "GET",
  },
  {
    adminPath: "doctors/abc/booking",
    backendPath: "/api/v1/admin/doctors/abc/booking",
    method: "PATCH",
  },
  { adminPath: "doctor-categories", backendPath: "/api/v1/admin/doctor-categories" },
  { adminPath: "hospitals", backendPath: "/api/v1/admin/hospitals" },
  { adminPath: "hospitals/h1", backendPath: "/api/v1/admin/hospitals/h1" },
  { adminPath: "users", backendPath: "/api/v1/admin/users" },
  { adminPath: "users/u1", backendPath: "/api/v1/admin/users/u1" },
  {
    adminPath: "users/u1/push",
    backendPath: "/api/v1/push/notify",
    method: "POST",
  },
  { adminPath: "documents", backendPath: "/api/v1/admin/documents", method: "GET" },
  { adminPath: "documents", backendPath: "/api/v1/admin/documents", method: "POST" },
  { adminPath: "documents/d1/deliver", backendPath: "/api/v1/admin/documents/d1/deliver", method: "POST" },
  {
    adminPath: "doctors/abc/document-deliveries",
    backendPath: "/api/v1/admin/doctors/abc/document-deliveries",
    method: "GET",
  },
  { adminPath: "payout-requests", backendPath: "/api/v1/admin/payout-requests" },
  {
    adminPath: "payout-requests/p1",
    backendPath: "/api/v1/admin/payout-requests",
    method: "GET",
  },
  {
    adminPath: "payout-requests/p1",
    backendPath: "/api/v1/admin/payout-requests/p1",
    method: "PATCH",
  },
  { adminPath: "wallet-transactions", backendPath: "/api/v1/admin/wallet-transactions" },
  { adminPath: "app-membership-members", backendPath: "/api/v1/admin/membership" },
  { adminPath: "app-membership-members/x/grant", backendPath: "/api/v1/admin/membership/grant" },
  { adminPath: "app-membership-members/x/revoke", backendPath: "/api/v1/admin/membership/x/revoke" },
  { adminPath: "app-membership-settings", backendPath: "/api/v1/admin/settings/subscription" },
  { adminPath: "finance-settings", backendPath: "/api/v1/admin/settings/finance" },
  { adminPath: "payment-settings", backendPath: "/api/v1/admin/settings/payment" },
  { adminPath: "app-version-settings", backendPath: "/api/v1/admin/settings/app_version" },
  { adminPath: "admins", backendPath: "/api/v1/admin/admins", method: "GET" },
  { adminPath: "admins", backendPath: "__admin_patch__", method: "PATCH" },
  { adminPath: "activity-logs", backendPath: "/api/v1/admin/activity-logs" },
  { adminPath: "legal-documents", backendPath: "/api/v1/admin/legal-documents" },
  { adminPath: "pregnancy-weeks", backendPath: "/api/v1/admin/pregnancy-weeks" },
  {
    adminPath: "pregnancy-weeks/abc",
    backendPath: "/api/v1/admin/pregnancy-weeks/abc",
    method: "PATCH",
  },
  {
    adminPath: "pregnancy-weeks/abc",
    backendPath: "/api/v1/admin/pregnancy-weeks/abc",
    method: "DELETE",
  },
  { adminPath: "child-growth", backendPath: "/api/v1/admin/child-growth-periods", method: "GET" },
  { adminPath: "child-growth", backendPath: "/api/v1/admin/child-growth-periods", method: "POST" },
  {
    adminPath: "child-growth/abc",
    backendPath: "/api/v1/admin/child-growth-periods/abc",
    method: "PATCH",
  },
  {
    adminPath: "followup-visits",
    backendPath: "/api/v1/admin/followup-templates",
    method: "GET",
  },
  {
    adminPath: "followup-visits",
    backendPath: "/api/v1/admin/followup-templates",
    method: "POST",
  },
  {
    adminPath: "followup-visits/abc",
    backendPath: "/api/v1/admin/followup-templates/abc",
    method: "PATCH",
  },  { adminPath: "referrals", backendPath: "/api/v1/admin/referrals" },
  { adminPath: "referral-commissions", backendPath: "/api/v1/admin/referral-commissions" },
  { adminPath: "referral-settings", backendPath: "/api/v1/admin/settings/referral" },
  {
    adminPath: "doctors/abc/referral-stats",
    backendPath: "/api/v1/admin/doctors/abc/referral-stats",
    method: "GET",
  },
  { adminPath: "daily-tips", backendPath: "/api/v1/admin/daily-tips", method: "GET" },
  { adminPath: "daily-tips", backendPath: "/api/v1/admin/daily-tips", method: "POST" },
  {
    adminPath: "daily-tips/abc",
    backendPath: "/api/v1/admin/daily-tips/abc",
    method: "PATCH",
  },
  {
    adminPath: "pregnancy-weeks/abc/translations",
    backendPath: "/api/v1/admin/pregnancy-weeks/abc/translations",
    method: "POST",
  },
  {
    adminPath: "pregnancy-weeks/abc/image",
    backendPath: "__pregnancy_week_image__",
    method: "PATCH",
  },
  {
    adminPath: "child-growth/learning-path-images",
    backendPath: "__learning_path_images__",
    method: "POST",
  },
  {
    adminPath: "child-growth/abc",
    backendPath: "/api/v1/admin/child-growth-periods/abc",
    method: "DELETE",
  },
  { adminPath: "clinical-advice", backendPath: "/api/v1/admin/clinical-advice", method: "GET" },
  { adminPath: "clinical-advice", backendPath: "/api/v1/admin/clinical-advice", method: "POST" },
  {
    adminPath: "clinical-advice/abc",
    backendPath: "/api/v1/admin/clinical-advice/abc",
    method: "PATCH",
  },
];
