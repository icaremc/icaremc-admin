/**
 * Staging / Render backend switch.
 * Production must leave NEXT_PUBLIC_USE_BACKEND_API unset or "false".
 */
export function isBackendApiEnabled(): boolean {
  const flag =
    process.env.NEXT_PUBLIC_USE_BACKEND_API?.trim().toLowerCase() ??
    process.env.USE_BACKEND_API?.trim().toLowerCase() ??
    "";
  return flag === "1" || flag === "true" || flag === "yes";
}

export function getBackendApiBaseUrl(): string {
  const raw =
    process.env.API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://icaremc-backend.onrender.com";
  return raw.replace(/\/$/, "");
}

export const BACKEND_ACCESS_COOKIE = "icare_be_access";
export const BACKEND_REFRESH_COOKIE = "icare_be_refresh";
