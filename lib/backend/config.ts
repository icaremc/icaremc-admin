/**
 * Staging / Render backend switch.
 * Production must leave NEXT_PUBLIC_USE_BACKEND_API unset or "false".
 */
export function isBackendApiEnabled(): boolean {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (
      host === "icaremc-admin-staging.vercel.app" ||
      host.endsWith("-icaremc-admin-staging.vercel.app")
    ) {
      return true;
    }
  }

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
    "https://api.icaremchealth.com";
  return raw.replace(/\/$/, "");
}

/** Backend often returns `/static/uploads/...`; browsers would hit the admin host otherwise. */
export function resolveBackendMediaUrl(
  url: string | null | undefined,
): string | null {
  if (url == null) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const base = getBackendApiBaseUrl();
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

export const BACKEND_ACCESS_COOKIE = "icare_be_access";
export const BACKEND_REFRESH_COOKIE = "icare_be_refresh";
