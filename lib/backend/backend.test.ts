import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adaptBackendResponse,
  deriveAppointmentStats,
} from "./adapters.ts";
import {
  ADMIN_API_MAPPING_CASES,
  getStagingCapability,
  isStagingDetailUnsupported,
  isStagingFeatureAvailable,
  mapAdminApiToBackend,
} from "./capabilities.ts";
import { isBackendApiEnabled, getBackendApiBaseUrl } from "./config.ts";
import { STAGING_BACKEND_ADMIN_ROUTES } from "./routes.ts";

describe("backend config", () => {
  it("defaults API base to render staging host", () => {
    const previous = process.env.API_BASE_URL;
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    assert.equal(getBackendApiBaseUrl(), "https://icaremc-backend.onrender.com");
    if (previous !== undefined) process.env.API_BASE_URL = previous;
  });

  it("reads USE_BACKEND_API flag", () => {
    const previous = process.env.NEXT_PUBLIC_USE_BACKEND_API;
    process.env.NEXT_PUBLIC_USE_BACKEND_API = "true";
    assert.equal(isBackendApiEnabled(), true);
    process.env.NEXT_PUBLIC_USE_BACKEND_API = "false";
    assert.equal(isBackendApiEnabled(), false);
    if (previous === undefined) delete process.env.NEXT_PUBLIC_USE_BACKEND_API;
    else process.env.NEXT_PUBLIC_USE_BACKEND_API = previous;
  });
});

describe("mapAdminApiToBackend", () => {
  for (const testCase of ADMIN_API_MAPPING_CASES) {
    it(`maps ${testCase.method ?? "GET"} ${testCase.adminPath} → ${testCase.backendPath ?? "null"}`, () => {
      assert.equal(
        mapAdminApiToBackend(testCase.adminPath, { method: testCase.method }),
        testCase.backendPath,
      );
    });
  }
});

describe("staging capabilities", () => {
  it("marks referrals unavailable", () => {
    assert.equal(isStagingFeatureAvailable("/admin/referrals"), false);
    assert.equal(getStagingCapability("/admin/referrals")?.backendHint ?? null, null);
  });

  it("marks dashboard available", () => {
    assert.equal(isStagingFeatureAvailable("/admin/dashboard"), true);
  });

  it("allows doctor and appointment detail via list synthesis", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    assert.equal(isStagingDetailUnsupported(`/admin/doctors/${id}`), false);
    assert.equal(isStagingFeatureAvailable(`/admin/doctors/${id}`), true);
    assert.equal(isStagingDetailUnsupported(`/admin/appointments/${id}`), false);
    assert.equal(isStagingFeatureAvailable(`/admin/appointments/${id}`), true);
    assert.equal(isStagingFeatureAvailable("/admin/doctors"), true);
  });

  it("marks about and app-version available", () => {
    assert.equal(isStagingFeatureAvailable("/admin/about"), true);
    assert.equal(isStagingFeatureAvailable("/admin/app-version"), true);
  });

  it("keeps broadcast push unavailable", () => {
    assert.equal(isStagingFeatureAvailable("/admin/push"), false);
  });
});

describe("adaptBackendResponse", () => {
  it("wraps doctors array", () => {
    const out = adaptBackendResponse("doctors", "GET", 200, [{ id: "1" }]);
    assert.deepEqual(out, { doctors: [{ id: "1" }] });
  });

  it("picks doctor detail from list", () => {
    const out = adaptBackendResponse("doctors/d1", "GET", 200, [
      { id: "d1", first_name: "A" },
      { id: "d2", first_name: "B" },
    ]);
    assert.deepEqual(out, { doctor: { id: "d1", first_name: "A" } });
  });

  it("wraps appointments array", () => {
    const out = adaptBackendResponse("appointments", "GET", 200, [{ id: "a" }]);
    assert.deepEqual(out, { appointments: [{ id: "a" }] });
  });

  it("picks appointment detail from list", () => {
    const out = adaptBackendResponse("appointments/a1", "GET", 200, [
      { id: "a1", status: "pending" },
    ]);
    assert.deepEqual(out, {
      appointment: { id: "a1", status: "pending" },
      conversation: null,
      messages: [],
    });
  });

  it("wraps dashboard object", () => {
    const out = adaptBackendResponse("dashboard/analytics", "GET", 200, {
      totalPaymentVolume: 10,
    });
    assert.deepEqual(out, {
      range: "30d",
      analytics: { totalPaymentVolume: 10 },
    });
  });

  it("derives appointment stats", () => {
    const stats = deriveAppointmentStats([
      { status: "pending" },
      { status: "pending" },
      { status: "completed" },
    ]);
    assert.equal(stats.total, 3);
    assert.equal(stats.pending, 2);
    assert.equal(stats.completed, 1);
  });

  it("adapts appointments/stats from list payload", () => {
    const out = adaptBackendResponse("appointments/stats", "GET", 200, [
      { status: "confirmed" },
    ]);
    assert.deepEqual(out, {
      total: 1,
      pending: 0,
      confirmed: 1,
      completed: 0,
      cancelled: 0,
    });
  });

  it("passes through errors", () => {
    const out = adaptBackendResponse("doctors", "GET", 501, { error: "nope" });
    assert.deepEqual(out, { error: "nope" });
  });
});

describe("staging route catalog", () => {
  it("lists every documented admin GET used in smoke", () => {
    assert.ok(STAGING_BACKEND_ADMIN_ROUTES.length >= 18);
    const labels = new Set(
      STAGING_BACKEND_ADMIN_ROUTES.map((route) => route.label),
    );
    assert.ok(labels.has("dashboard"));
    assert.ok(labels.has("doctors"));
    assert.ok(labels.has("auth-me"));
  });
});
