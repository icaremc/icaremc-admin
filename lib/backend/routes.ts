/** Canonical staging Render admin routes (from OpenAPI). Used by smoke tests. */
export const STAGING_BACKEND_ADMIN_ROUTES = [
  { method: "GET", path: "/api/v1/admin/dashboard", label: "dashboard" },
  { method: "GET", path: "/api/v1/admin/appointments", label: "appointments" },
  { method: "GET", path: "/api/v1/admin/doctors", label: "doctors" },
  { method: "GET", path: "/api/v1/admin/doctor-categories", label: "doctor-categories" },
  { method: "GET", path: "/api/v1/admin/hospitals", label: "hospitals" },
  { method: "GET", path: "/api/v1/admin/users", label: "users" },
  { method: "GET", path: "/api/v1/admin/documents", label: "documents" },
  { method: "GET", path: "/api/v1/admin/membership", label: "membership" },
  { method: "GET", path: "/api/v1/admin/payout-requests", label: "payout-requests" },
  { method: "GET", path: "/api/v1/admin/wallet-transactions", label: "wallet-transactions" },
  { method: "GET", path: "/api/v1/admin/admins", label: "admins" },
  { method: "GET", path: "/api/v1/admin/activity/admin", label: "activity-admin" },
  { method: "GET", path: "/api/v1/admin/activity/platform", label: "activity-platform" },
  { method: "GET", path: "/api/v1/admin/legal-documents", label: "legal-documents" },
  { method: "GET", path: "/api/v1/admin/pregnancy-weeks", label: "pregnancy-weeks" },
  { method: "GET", path: "/api/v1/admin/child-growth-periods", label: "child-growth-periods" },
  { method: "GET", path: "/api/v1/admin/followup-templates", label: "followup-templates" },
  { method: "GET", path: "/api/v1/admin/settings/finance", label: "settings-finance" },
  { method: "GET", path: "/api/v1/admin/settings/payment", label: "settings-payment" },
  { method: "GET", path: "/api/v1/auth/me", label: "auth-me" },
] as const;

export type StagingBackendAdminRoute = (typeof STAGING_BACKEND_ADMIN_ROUTES)[number];
