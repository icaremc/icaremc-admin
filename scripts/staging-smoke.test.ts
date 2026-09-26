/**
 * Smoke-test each staging Render admin route.
 *
 * Usage:
 *   npm run test:staging-smoke
 *   STAGING_ADMIN_EMAIL=… STAGING_ADMIN_PASSWORD=… npm run test:staging-smoke
 *
 * Without credentials, expects 401 on protected routes (proves route exists).
 * With credentials, expects 200 on each GET.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

const BASE =
  process.env.API_BASE_URL?.replace(/\/$/, "") ||
  "https://icaremc-backend.onrender.com";

const EMAIL = process.env.STAGING_ADMIN_EMAIL?.trim() ?? "";
const PASSWORD = process.env.STAGING_ADMIN_PASSWORD ?? "";

const ROUTES = [
  "/api/v1/admin/dashboard",
  "/api/v1/admin/appointments",
  "/api/v1/admin/doctors",
  "/api/v1/admin/doctor-categories",
  "/api/v1/admin/hospitals",
  "/api/v1/admin/users",
  "/api/v1/admin/documents",
  "/api/v1/admin/membership",
  "/api/v1/admin/payout-requests",
  "/api/v1/admin/wallet-transactions",
  "/api/v1/admin/admins",
  "/api/v1/admin/activity/admin",
  "/api/v1/admin/activity/platform",
  "/api/v1/admin/legal-documents",
  "/api/v1/admin/pregnancy-weeks",
  "/api/v1/admin/child-growth-periods",
  "/api/v1/admin/followup-templates",
  "/api/v1/admin/settings/finance",
  "/api/v1/admin/settings/payment",
];

async function login(): Promise<string | null> {
  if (!EMAIL || !PASSWORD) return null;
  const res = await fetch(`${BASE}/api/v1/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: EMAIL, password: PASSWORD }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed ${res.status}: ${text}`);
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Login missing access_token");
  return body.access_token;
}

describe("staging Render API smoke", () => {
  it("openapi docs are reachable", async () => {
    const res = await fetch(`${BASE}/openapi.json`);
    assert.equal(res.ok, true);
    const body = (await res.json()) as { info?: { title?: string } };
    assert.ok(body.info?.title);
  });

  it("hits every admin GET (401 without auth, or 200 with auth)", async () => {
    const token = await login();
    const failures: string[] = [];

    for (const path of ROUTES) {
      const res = await fetch(`${BASE}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (token) {
        if (res.status !== 200) {
          failures.push(`${path} → ${res.status}`);
        }
      } else if (res.status !== 401 && res.status !== 403) {
        // Unauthenticated should be rejected; 404 means route missing
        failures.push(`${path} → ${res.status} (expected 401/403 without credentials)`);
      }
    }

    assert.equal(
      failures.length,
      0,
      failures.join("\n") || "ok",
    );
  });

  it("auth/me works when credentials provided", async () => {
    const token = await login();
    if (!token) {
      console.log("skip auth/me — set STAGING_ADMIN_EMAIL and STAGING_ADMIN_PASSWORD");
      return;
    }
    const res = await fetch(`${BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
  });
});
