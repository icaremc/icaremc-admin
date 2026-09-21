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
  { pathPrefix: "/admin/appointments", label: "Appointments", backendHint: "GET /api/v1/admin/appointments" },
  { pathPrefix: "/admin/doctors", label: "Doctors", backendHint: "GET /api/v1/admin/doctors" },
  {
    pathPrefix: "/admin/doctor-categories",
    label: "Speciality",
    backendHint: "GET|POST /api/v1/admin/doctor-categories",
  },
  { pathPrefix: "/admin/hospitals", label: "Hospitals", backendHint: "GET|POST|PATCH /api/v1/admin/hospitals" },
  { pathPrefix: "/admin/users", label: "Parents", backendHint: "GET /api/v1/admin/users" },
  { pathPrefix: "/admin/documents", label: "Internal docs", backendHint: "GET|POST deliver /api/v1/admin/documents" },
  {
    pathPrefix: "/admin/finance/payout-request",
    label: "Payout requests",
    backendHint: "GET|POST /api/v1/admin/payout-requests",
  },
  {
    pathPrefix: "/admin/finance/wallet-transactions",
    label: "Wallet transactions",
    backendHint: "GET /api/v1/admin/wallet-transactions",
  },
  {
    pathPrefix: "/admin/finance/app-membership",
    label: "App membership",
    backendHint: "GET|grant|revoke /api/v1/admin/membership",
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
  { pathPrefix: "/admin/admins", label: "Portal admins", backendHint: "GET|POST /api/v1/admin/admins" },
  { pathPrefix: "/admin/activity", label: "Activity log", backendHint: "GET /api/v1/admin/activity/*" },
  { pathPrefix: "/admin/legal", label: "Policies", backendHint: "GET|PUT /api/v1/admin/legal-documents" },
  {
    pathPrefix: "/admin/pregnancy-weeks",
    label: "Pregnancy weeks",
    backendHint: "GET|POST /api/v1/admin/pregnancy-weeks",
  },
  {
    pathPrefix: "/admin/child-growth",
    label: "Child milestones",
    backendHint: "GET /api/v1/admin/child-growth-periods (partial)",
  },
  {
    pathPrefix: "/admin/followup-visits",
    label: "Follow-up visits",
    backendHint: "GET /api/v1/admin/followup-templates (partial)",
  },

  // Explicitly missing vs current production admin
  { pathPrefix: "/admin/referrals", label: "Referrals", backendHint: null },
  { pathPrefix: "/admin/children", label: "Children", backendHint: null },
  { pathPrefix: "/admin/content", label: "Content CMS", backendHint: null },
  { pathPrefix: "/admin/push", label: "Push notifications", backendHint: null },
  { pathPrefix: "/admin/app-version", label: "App release", backendHint: null },
  { pathPrefix: "/admin/about", label: "About the app", backendHint: null },
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

export function isStagingFeatureAvailable(pathname: string): boolean {
  const cap = getStagingCapability(pathname);
  if (!cap) return true;
  return cap.backendHint !== null;
}

/** Map /api/admin/... remainder → backend path or null if unsupported. */
export function mapAdminApiToBackend(adminPath: string): string | null {
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
      // detail / status updates not exposed as dedicated admin routes on staging
      return null;
    case "doctors":
      if (rest.length === 0) return "/api/v1/admin/doctors";
      if (rest.length === 1) return null; // detail still supabase-shaped locally
      if (rest[1] === "verify" || (rest.length === 2 && rest[1] === "verify")) {
        return `/api/v1/admin/doctors/${rest[0]}/verify`;
      }
      return null;
    case "doctor-categories":
      if (rest.length === 0) return "/api/v1/admin/doctor-categories";
      return null;
    case "hospitals":
      if (rest.length === 0) return "/api/v1/admin/hospitals";
      if (rest.length === 1) return `/api/v1/admin/hospitals/${rest[0]}`;
      return null;
    case "users":
      if (rest.length === 0) return "/api/v1/admin/users";
      if (rest.length === 1) return `/api/v1/admin/users/${rest[0]}`;
      return null;
    case "documents":
      if (rest.length === 0) return "/api/v1/admin/documents";
      if (rest.length === 2 && rest[1] === "deliver") {
        return `/api/v1/admin/documents/${rest[0]}/deliver`;
      }
      return null;
    case "payout-requests":
      if (rest.length === 0) return "/api/v1/admin/payout-requests";
      if (rest.length === 1) return `/api/v1/admin/payout-requests/${rest[0]}`;
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
    case "finance-settings":
      return "/api/v1/admin/settings/finance";
    case "payment-settings":
      return "/api/v1/admin/settings/payment";
    case "admins":
      return "/api/v1/admin/admins";
    case "activity-logs":
      return "/api/v1/admin/activity/admin";
    case "activity":
      if (rest[0] === "log") return null;
      return "/api/v1/admin/activity/platform";
    case "legal-documents":
      return "/api/v1/admin/legal-documents";
    case "pregnancy-weeks":
      if (rest.length === 0) return "/api/v1/admin/pregnancy-weeks";
      if (rest[1] === "translations") {
        return `/api/v1/admin/pregnancy-weeks/${rest[0]}/translations`;
      }
      return null;
    case "child-growth":
      if (rest[0] === "learning-path-images") return null;
      return "/api/v1/admin/child-growth-periods";
    case "referrals":
    case "referral-settings":
    case "referral-commissions":
      return null;
    default:
      return null;
  }
}
