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
import {
  isBackendApiEnabled,
  getBackendApiBaseUrl,
  resolveBackendMediaUrl,
} from "./config.ts";
import { STAGING_BACKEND_ADMIN_ROUTES } from "./routes.ts";

describe("backend config", () => {
  it("defaults API base to render staging host", () => {
    const previous = process.env.API_BASE_URL;
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    assert.equal(getBackendApiBaseUrl(), "https://api.icaremchealth.com");
    if (previous !== undefined) process.env.API_BASE_URL = previous;
  });

  it("absolutizes relative backend media URLs", () => {
    assert.equal(
      resolveBackendMediaUrl("/static/uploads/pregnancy-weeks/x.jpg"),
      "https://api.icaremchealth.com/static/uploads/pregnancy-weeks/x.jpg",
    );
    assert.equal(
      resolveBackendMediaUrl("https://cdn.example/a.jpg"),
      "https://cdn.example/a.jpg",
    );
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
  it("marks clinical advice available (read) under child-growth", () => {
    assert.equal(
      isStagingFeatureAvailable("/admin/child-growth/clinical-advice"),
      true,
    );
    assert.equal(
      getStagingCapability("/admin/child-growth/clinical-advice")?.label,
      "Clinical advice",
    );
  });

  it("marks referrals available", () => {
    assert.equal(isStagingFeatureAvailable("/admin/referrals"), true);
    assert.ok(getStagingCapability("/admin/referrals")?.backendHint);
    assert.equal(isStagingFeatureAvailable("/admin/finance/referral-settings"), true);
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

  it("marks children available", () => {
    assert.equal(isStagingFeatureAvailable("/admin/children"), true);
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
    assert.deepEqual(out, {
      doctors: [
        {
          id: "1",
          profile_photo_url: null,
          license_image_url: null,
          degree_image_url: null,
        },
      ],
    });
  });

  it("picks doctor detail from list", () => {
    const out = adaptBackendResponse("doctors/d1", "GET", 200, [
      { id: "d1", first_name: "A" },
      { id: "d2", first_name: "B" },
    ]);
    assert.deepEqual(out, {
      doctor: {
        id: "d1",
        first_name: "A",
        profile_photo_url: null,
        license_image_url: null,
        degree_image_url: null,
      },
    });
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

  it("wraps hospital POST object", () => {
    const out = adaptBackendResponse("hospitals", "POST", 200, {
      id: "h1",
      name: "St Paul",
      slug: "st-paul",
    });
    assert.deepEqual(out, {
      hospital: { id: "h1", name: "St Paul", slug: "st-paul", image_url: null },
    });
  });

  it("adapts app-membership-settings as appMembershipSettings", () => {
    const out = adaptBackendResponse("app-membership-settings", "GET", 200, {
      data: {
        enabled: true,
        yearlyPrice: 1500,
        currency: "ETB",
        durationDays: 365,
        requireForAppAccess: true,
      },
      updated_at: "2026-01-01T00:00:00Z",
    });
    assert.deepEqual(out, {
      appMembershipSettings: {
        enabled: true,
        yearlyPrice: 1500,
        currency: "ETB",
        durationDays: 365,
        requireForAppAccess: true,
      },
      updatedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("adapts public doctor detail with services", () => {
    const out = adaptBackendResponse("doctors/d1", "GET", 200, {
      doctor: { id: "d1", first_name: "A" },
      services: [{ id: "s1", name: "Consult", price: 100, currency: "ETB" }],
      slots: [],
    });
    assert.deepEqual(out, {
      doctor: {
        id: "d1",
        first_name: "A",
        profile_photo_url: null,
        license_image_url: null,
        degree_image_url: null,
        doctor_services: [{ id: "s1", name: "Consult", price: 100, currency: "ETB" }],
        doctor_availability_slots: [],
      },
    });
  });

  it("wraps legal-document save", () => {
    const out = adaptBackendResponse(
      "legal-documents",
      "PATCH",
      200,
      { slug: "privacy", title: "Privacy", locale: "en", sections: [] },
    );
    assert.deepEqual(out, {
      document: { slug: "privacy", title: "Privacy", locale: "en", sections: [] },
    });
  });

  it("adapts referrals list to camelCase", () => {
    const out = adaptBackendResponse(
      "referrals",
      "GET",
      200,
      [
        {
          id: "r1",
          patient_id: "p1",
          doctor_id: "d1",
          referral_code: "ABC",
          created_at: "2026-01-02T00:00:00Z",
          patient_name: "Pat",
          patient_phone: null,
          doctor_name: "Doc",
          is_subscribed: true,
        },
      ],
      { searchParams: new URLSearchParams("subscribed=yes") },
    );
    assert.deepEqual(out, {
      referrals: [
        {
          id: "r1",
          patientId: "p1",
          doctorId: "d1",
          referralCode: "ABC",
          createdAt: "2026-01-02T00:00:00Z",
          patientName: "Pat",
          patientPhone: null,
          doctorName: "Doc",
          isSubscribed: true,
        },
      ],
    });
  });

  it("absolutizes doctor profile and credential media URLs", () => {
    const list = adaptBackendResponse("doctors", "GET", 200, [
      {
        id: "d1",
        profile_photo_url: "/static/uploads/a.jpg",
        license_image_url: "/static/uploads/b.jpg",
        degree_image_url: null,
      },
    ]) as {
      doctors: Array<{
        profile_photo_url: string | null;
        license_image_url: string | null;
        degree_image_url: string | null;
      }>;
    };
    assert.equal(
      list.doctors[0]?.profile_photo_url,
      "https://api.icaremchealth.com/static/uploads/a.jpg",
    );
    assert.equal(
      list.doctors[0]?.license_image_url,
      "https://api.icaremchealth.com/static/uploads/b.jpg",
    );
    assert.equal(list.doctors[0]?.degree_image_url, null);

    const detail = adaptBackendResponse(
      "doctors/d1",
      "GET",
      200,
      {
        doctor: {
          id: "d1",
          profile_photo_url: "/static/uploads/c.jpg?t=1",
        },
        services: [],
        slots: [],
      },
    ) as { doctor: { profile_photo_url: string | null } };
    assert.equal(
      detail.doctor.profile_photo_url,
      "https://api.icaremchealth.com/static/uploads/c.jpg?t=1",
    );
  });

  it("adapts referral-stats and referral-settings", () => {
    assert.deepEqual(
      adaptBackendResponse("doctors/d1/referral-stats", "GET", 200, {
        referral_code: "XYZ",
        referred_count: 3,
        total_commission: 12.5,
        currency: "ETB",
      }),
      {
        stats: {
          referralCode: "XYZ",
          referredCount: 3,
          totalCommission: 12.5,
          currency: "ETB",
        },
      },
    );
    assert.deepEqual(
      adaptBackendResponse("referral-settings", "GET", 200, {
        data: { commissionPercent: 25 },
        updated_at: "2026-01-01T00:00:00Z",
      }),
      {
        referralSettings: { commissionPercent: 25 },
        updatedAt: "2026-01-01T00:00:00Z",
      },
    );
  });

  it("adapts child detail row into empty-extras envelope", () => {
    const out = adaptBackendResponse("children/c1", "GET", 200, {
      id: "c1",
      name: "Amina",
      gender: "female",
    });
    assert.deepEqual(out, {
      child: { id: "c1", name: "Amina", gender: "female" },
      milestoneChecks: [],
      measurements: [],
      vaccineRecords: [],
      vaccineSchedule: [],
      growthPeriods: [],
    });
  });

  it("nests pregnancy week translations for admin UI", () => {
    const out = adaptBackendResponse("pregnancy-weeks", "GET", 200, [
      {
        id: "w1",
        week_number: 31,
        trimester: 3,
        image_url: "/static/uploads/pregnancy-weeks/w1/week-31.jpg",
        pregnancy_week_translations: [
          {
            id: "t1",
            pregnancy_week_id: "w1",
            language_code: "en",
            title: "31 weeks",
            sections: [],
          },
        ],
      },
    ]) as {
      weeks: Array<{
        pregnancy_week_translations?: unknown[];
        image_url?: string | null;
      }>;
    };
    assert.equal(out.weeks[0]?.pregnancy_week_translations?.length, 1);
    assert.equal(
      out.weeks[0]?.image_url,
      "https://api.icaremchealth.com/static/uploads/pregnancy-weeks/w1/week-31.jpg",
    );
  });

  it("maps clinical advice singular translation into nested rows", () => {
    const out = adaptBackendResponse("clinical-advice", "GET", 200, [
      {
        id: "a1",
        code: "wfa_high",
        metric: "weight",
        condition: "high",
        min_age_months: 6,
        max_age_months: 240,
        sort_order: 1,
        is_active: true,
        translation: {
          id: "tr1",
          advice_id: "a1",
          language_code: "en",
          explain_text: "Heavy",
          causes: "Diet",
          recommendations: "Play",
        },
      },
    ]) as {
      items: Array<{ growth_clinical_advice_translations?: unknown[] }>;
    };
    assert.equal(out.items[0]?.growth_clinical_advice_translations?.length, 1);
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
