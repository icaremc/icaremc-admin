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

  it("uses the backend API (no Supabase)", () => {
    assert.equal(isBackendApiEnabled(), true);
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
    const nested = adaptBackendResponse(
      "legal-documents",
      "PATCH",
      200,
      {
        document: {
          slug: "about-app",
          locale: "en",
          title: "About iCare MC",
          sections: [{ title: "About", body: "Help" }],
          updated_at: "2026-10-06T11:43:11.134+00:00",
        },
      },
    ) as { document: { slug: string; sections: unknown[] } };
    assert.equal(nested.document.slug, "about-app");
    assert.equal(nested.document.sections.length, 1);
  });

  it("adapts settings PUT envelopes without double-wrapping", () => {
    const finance = adaptBackendResponse("finance-settings", "PUT", 200, {
      financeSettings: {
        minimumAmountWithdraw: 1,
        platformCommissionPercent: 30,
        doctorCancelPenaltyEnabled: true,
        doctorCancelPenaltyAmount: 100,
      },
      updatedAt: "2026-10-06T10:57:20.896931+00:00",
    }) as {
      financeSettings: { minimumAmountWithdraw: number };
      updatedAt: string | null;
    };
    assert.equal(finance.financeSettings.minimumAmountWithdraw, 1);
    assert.equal(finance.updatedAt, "2026-10-06T10:57:20.896931+00:00");

    const payment = adaptBackendResponse("payment-settings", "PUT", 200, {
      paymentSettings: {
        chapa: { name: "Chapa", enable: true, feePercent: 2.5 },
      },
      updatedAt: "2026-10-06T11:02:23.035871+00:00",
    }) as { paymentSettings: { chapa: { name: string } } };
    assert.equal(payment.paymentSettings.chapa.name, "Chapa");

    const referral = adaptBackendResponse("referral-settings", "PUT", 200, {
      referralSettings: { commissionPercent: 20 },
      updatedAt: "2026-10-06T08:21:03.122649+00:00",
    }) as { referralSettings: { commissionPercent: number } };
    assert.equal(referral.referralSettings.commissionPercent, 20);

    const membership = adaptBackendResponse(
      "app-membership-settings",
      "PUT",
      200,
      {
        appMembershipSettings: {
          enabled: true,
          yearlyPrice: 100,
          currency: "ETB",
          durationDays: 365,
          requireForAppAccess: true,
        },
        updatedAt: "2026-10-06T12:32:14.442553+00:00",
      },
    ) as { appMembershipSettings: { yearlyPrice: number } };
    assert.equal(membership.appMembershipSettings.yearlyPrice, 100);

    const appVersion = adaptBackendResponse(
      "app-version-settings",
      "PUT",
      200,
      {
        app: "mc",
        appVersionSettings: {
          min_version: "1.0.0",
          force_update: false,
          message_en: "Update",
          message_am: "",
          message_om: "",
        },
        updatedAt: "2026-10-06T11:23:42.643865+00:00",
      },
      { searchParams: new URLSearchParams("app=mc") },
    ) as {
      app: string;
      appVersionSettings: { min_version: string };
      updatedAt: string | null;
    };
    assert.equal(appVersion.app, "mc");
    assert.equal(appVersion.appVersionSettings.min_version, "1.0.0");
    assert.equal(appVersion.updatedAt, "2026-10-06T11:23:42.643865+00:00");
  });

  it("keeps document preview_url and wallet doctor_profiles", () => {
    const docs = adaptBackendResponse("documents", "GET", 200, [
      {
        id: "d1",
        title: "Agreement",
        category: "agreement",
        storage_path: "library/a.pdf",
        file_name: "a.pdf",
        mime_type: "application/pdf",
        uploaded_by: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
        preview_url: "https://example.com/a.pdf",
      },
    ]) as { documents: Array<{ preview_url: string | null; title: string }> };
    assert.equal(docs.documents[0]?.preview_url, "https://example.com/a.pdf");

    const wallet = adaptBackendResponse("wallet-transactions", "GET", 200, {
      transactions: [
        {
          id: "t1",
          doctor_id: "doc1",
          amount: 200,
          is_credit: true,
          type: "adjustment",
          appointment_id: null,
          payout_request_id: null,
          note: "Referral commission",
          created_at: "2026-09-18T02:53:33Z",
          doctor_profiles: { first_name: "Tigist", last_name: "Argaw" },
        },
      ],
    }) as {
      transactions: Array<{
        doctor_profiles: { first_name: string; last_name: string } | null;
      }>;
    };
    assert.equal(wallet.transactions[0]?.doctor_profiles?.first_name, "Tigist");
  });

  it("maps doctor verify as POST /doctors/{id}/verify", () => {
    assert.equal(
      mapAdminApiToBackend("doctors/abc/verify", { method: "POST" }),
      "/api/v1/admin/doctors/abc/verify",
    );
    assert.equal(mapAdminApiToBackend("doctors/abc", { method: "PATCH" }), null);
    const out = adaptBackendResponse(
      "doctors/abc/verify",
      "POST",
      200,
      { id: "abc", is_verified: true, first_name: "A" },
    ) as { doctor: { id: string; is_verified: boolean } };
    assert.equal(out.doctor.id, "abc");
    assert.equal(out.doctor.is_verified, true);
  });

  it("adapts user referral GET and POST", () => {
    assert.equal(
      mapAdminApiToBackend("users/u1/referral", { method: "GET" }),
      "/api/v1/admin/users/u1/referral",
    );
    assert.equal(
      mapAdminApiToBackend("users/u1/referral", { method: "POST" }),
      "/api/v1/admin/users/u1/referral",
    );
    const out = adaptBackendResponse("users/u1/referral", "GET", 200, {
      referral: {
        referralCodeUsed: "MCNWMM4Y",
        referredByDoctorId: "doc-1",
        referredByDoctorName: "Dr. Selamawit Muleta",
        referredAt: "2026-10-05T11:20:59.103769+00:00",
        canApplyCode: false,
      },
    }) as {
      referral: {
        referralCodeUsed: string;
        referredByDoctorId: string;
        canApplyCode: boolean;
      };
    };
    assert.equal(out.referral.referralCodeUsed, "MCNWMM4Y");
    assert.equal(out.referral.referredByDoctorId, "doc-1");
    assert.equal(out.referral.canApplyCode, false);

    const applied = adaptBackendResponse("users/u1/referral", "POST", 200, {
      referral_code_used: "ABC",
      referred_by_doctor_id: "d1",
      can_apply_code: false,
    }) as { referral: { referralCodeUsed: string; canApplyCode: boolean } };
    assert.equal(applied.referral.referralCodeUsed, "ABC");
    assert.equal(applied.referral.canApplyCode, false);
  });

  it("adapts doctor wallet bundle into history envelope", () => {
    const out = adaptBackendResponse("doctors/d1/wallet", "GET", 200, {
      wallet: {
        available_balance: 1200,
        pending_balance: 100,
        currency: "ETB",
      },
      transactions: [
        {
          id: "t1",
          doctor_id: "d1",
          amount: 500,
          is_credit: true,
          type: "appointment_earning",
          appointment_id: "a1",
          payout_request_id: null,
          note: null,
          created_at: "2026-09-18T02:53:33Z",
        },
        {
          id: "t2",
          doctor_id: "d1",
          amount: 50,
          is_credit: false,
          type: "payout_hold",
          appointment_id: null,
          payout_request_id: "p1",
          note: "Hold",
          created_at: "2026-09-19T02:53:33Z",
        },
      ],
    }) as {
      history: {
        wallet: { available_balance: number; pending_balance: number };
        commissionPercent: number;
        earnings: Array<{ id: string; amount: number }>;
        transactions: Array<{ id: string; type: string }>;
      };
    };
    assert.equal(out.history.wallet.available_balance, 1200);
    assert.equal(out.history.wallet.pending_balance, 100);
    assert.equal(out.history.transactions.length, 2);
    assert.equal(out.history.earnings.length, 1);
    assert.equal(out.history.earnings[0]?.id, "t1");
    assert.equal(out.history.commissionPercent, 30);
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
      birth_date: "2022-08-20",
    }) as {
      child: { id: string; name: string; gender: string; birth_date: string };
      milestoneChecks: unknown[];
    };
    assert.equal(out.child.id, "c1");
    assert.equal(out.child.name, "Amina");
    assert.equal(out.child.gender, "female");
    assert.equal(out.child.birth_date, "2022-08-20");
    assert.deepEqual(out.milestoneChecks, []);
  });

  it("maps activity-logs list to CombinedActivityLog shape", () => {
    assert.equal(
      mapAdminApiToBackend("activity-logs", {
        method: "GET",
        searchParams: new URLSearchParams("source=all&limit=100"),
      }),
      "/api/v1/admin/activity-logs",
    );
    const out = adaptBackendResponse(
      "activity-logs",
      "GET",
      200,
      {
        logs: [
          {
            id: "87599396-efbe-4625-9dd4-04dc48eaa8d3",
            actor_id: "ae7f1336-b0bd-412c-84e7-bb6fecf79904",
            actor_email: null,
            actor_name: null,
            actor_role: "super_admin",
            event_type: "appointment.status",
            event_label: "Appointment status updated",
            resource_type: null,
            resource_id: null,
            ip_address: null,
            user_agent: null,
            created_at: "2026-10-05T13:16:38.651266Z",
          },
        ],
      },
      { searchParams: new URLSearchParams("source=all&limit=100") },
    ) as {
      logs: Array<{
        id: string;
        source: string;
        actor_type: string | null;
        event_type: string;
        metadata: Record<string, unknown>;
      }>;
    };
    assert.equal(out.logs.length, 1);
    assert.equal(out.logs[0]?.source, "admin");
    assert.equal(out.logs[0]?.actor_type, "admin");
    assert.equal(out.logs[0]?.event_type, "appointment.status");
    assert.deepEqual(out.logs[0]?.metadata, {});
  });

  it("keeps child list fields and nested profiles", () => {
    const out = adaptBackendResponse("children", "GET", 200, {
      children: [
        {
          id: "6cf371d1-18df-4b1f-8cda-41f56953d814",
          user_id: "48af816b-ab14-406c-8e53-dfa2fc2fde13",
          pregnancy_id: null,
          local_id: "1791206341790978_148589",
          name: "loyd gebrekidan",
          gender: "female",
          birth_date: "2022-08-20",
          birth_weight: null,
          birth_height: null,
          delivery_type: null,
          is_active: true,
          created_at: "2026-10-05T13:19:02.327493+00:00",
          updated_at: "2026-10-05T13:24:15.446554+00:00",
          gestational_age_weeks: null,
          gestational_age_days: null,
          birth_hospital: null,
          blood_group: null,
          woreda: null,
          photo_url: null,
          profiles: {
            id: "48af816b-ab14-406c-8e53-dfa2fc2fde13",
            phone: "+251937254403",
            locale: "en",
            full_name: "Meron Asfaw",
            created_at: "2026-10-05T13:18:25.008611+00:00",
            account_type: "Mother",
            onboarding_complete: true,
            notifications_enabled: true,
          },
        },
      ],
    }) as {
      children: Array<{
        id: string;
        local_id: string | null;
        gestational_age_weeks: number | null;
        profiles: { full_name: string | null; phone: string | null } | null;
      }>;
    };
    assert.equal(out.children.length, 1);
    assert.equal(out.children[0]?.local_id, "1791206341790978_148589");
    assert.equal(out.children[0]?.gestational_age_weeks, null);
    assert.equal(out.children[0]?.profiles?.full_name, "Meron Asfaw");
    assert.equal(out.children[0]?.profiles?.phone, "+251937254403");
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
