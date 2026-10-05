/**
 * Normalize Render staging responses into the shapes existing admin UI expects.
 */

import { parseAppMembershipSettingsData } from "../appMembership/subscriptionSettings.ts";
import { resolveBackendMediaUrl } from "./config.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** GET /admin/dashboard charts: `{ date, amount }` → UI `{ label, value }`. */
function mapDashboardChart(rows: unknown): Array<{ label: string; value: number }> {
  if (!Array.isArray(rows)) return [];
  const out: Array<{ label: string; value: number }> = [];
  for (const row of rows) {
    if (!isPlainObject(row)) continue;
    const amount = asNumber(row.amount ?? row.value);
    const dateRaw = row.date ?? row.label;
    let label =
      typeof dateRaw === "string"
        ? dateRaw
        : dateRaw == null
          ? ""
          : String(dateRaw);
    if (typeof dateRaw === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateRaw)) {
      const d = new Date(`${dateRaw.slice(0, 10)}T00:00:00`);
      if (!Number.isNaN(d.getTime())) {
        label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    }
    out.push({ label, value: amount });
  }
  return out;
}

function adaptAdminDashboard(body: Record<string, unknown>, range: string) {
  // ponytail: API has no range filter yet; pass through UI range for the selector only
  const analytics = {
    ...body,
    totalTransactions: asNumber(body.transactions_count ?? body.totalTransactions),
    totalPaymentVolume: asNumber(
      body.appointment_payments_sum ?? body.totalPaymentVolume,
    ),
    doctorBookingEarnings: asNumber(
      body.doctor_earnings_sum ?? body.doctorBookingEarnings,
    ),
    doctorBookingEarningCount: asNumber(
      body.doctor_earnings_count ?? body.doctorBookingEarningCount,
    ),
    totalCommission: asNumber(body.commission_sum ?? body.totalCommission),
    monthlyCommission: asNumber(
      body.monthly_commission ?? body.monthlyCommission ?? body.commission_sum,
    ),
    commissionChange: asNumber(body.commission_growth ?? body.commissionChange),
    commissionPercent: asNumber(body.commission_percent ?? body.commissionPercent),
    completedPaidBookings: asNumber(
      body.appointment_payments_count ?? body.completedPaidBookings,
    ),
    subscriptionPaymentCount: asNumber(
      body.subscription_payments_count ?? body.subscriptionPaymentCount,
    ),
    subscriptionPaymentVolume: asNumber(
      body.subscription_payments_sum ?? body.subscriptionPaymentVolume,
    ),
    paymentChart: mapDashboardChart(
      body.appointment_payments_chart ?? body.paymentChart,
    ),
    commissionChart: mapDashboardChart(
      body.commission_chart ?? body.commissionChart,
    ),
    subscriptionChart: mapDashboardChart(
      body.subscription_payments_chart ?? body.subscriptionChart,
    ),
    doctorEarningsChart: mapDashboardChart(
      body.doctor_earnings_chart ?? body.doctorEarningsChart,
    ),
  };
  return { range, analytics };
}

function findById(rows: unknown[], id: string): Record<string, unknown> | null {
  for (const row of rows) {
    if (isPlainObject(row) && String(row.id) === id) return row;
  }
  return null;
}

function pushReadinessFromToken(
  fcmToken: unknown,
  notificationsEnabled: unknown,
): {
  fcmRegistered: boolean;
  notificationsEnabled: boolean;
  canSend: boolean;
  reason: string | null;
  role: string | null;
} {
  const registered = typeof fcmToken === "string" && fcmToken.length > 0;
  const enabled = notificationsEnabled !== false;
  if (!registered) {
    return {
      fcmRegistered: false,
      notificationsEnabled: enabled,
      canSend: false,
      reason: "No FCM token registered",
      role: null,
    };
  }
  if (!enabled) {
    return {
      fcmRegistered: true,
      notificationsEnabled: false,
      canSend: false,
      reason: "Notifications disabled",
      role: null,
    };
  }
  return {
    fcmRegistered: true,
    notificationsEnabled: true,
    canSend: true,
    reason: null,
    role: null,
  };
}

export type AdaptOptions = {
  searchParams?: URLSearchParams;
};

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function translationList(
  row: Record<string, unknown>,
  nestedKeys: string[],
): Record<string, unknown>[] {
  for (const key of nestedKeys) {
    const nested = row[key];
    if (Array.isArray(nested) && nested.some(isPlainObject)) {
      return nested.filter(isPlainObject);
    }
  }
  if (Array.isArray(row.translations) && row.translations.some(isPlainObject)) {
    return row.translations.filter(isPlainObject);
  }
  if (isPlainObject(row.translation)) return [row.translation];
  return [];
}

function mapDailyTipRow(row: Record<string, unknown>) {
  const translations = translationList(row, ["daily_tip_translations"]).map(
    (item) => ({
      id: str(item.id),
      tip_id: str(item.tip_id ?? item.tipId ?? row.id),
      language_code: str(item.language_code ?? item.languageCode ?? "en"),
      title: str(item.title),
      content: str(item.content),
      created_at: str(item.created_at ?? item.createdAt),
      updated_at: str(item.updated_at ?? item.updatedAt),
    }),
  );
  return {
    id: str(row.id),
    week_number: num(row.week_number ?? row.weekNumber),
    day_number:
      row.day_number == null && row.dayNumber == null
        ? null
        : num(row.day_number ?? row.dayNumber),
    category: (row.category ?? null) as string | null,
    is_active: Boolean(row.is_active ?? row.isActive ?? true),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    daily_tip_translations: translations,
  };
}

function mapPregnancyWeekRow(row: Record<string, unknown>) {
  const translations = translationList(row, ["pregnancy_week_translations"]).map(
    (item) => ({
      id: str(item.id),
      pregnancy_week_id: str(
        item.pregnancy_week_id ?? item.pregnancyWeekId ?? row.id,
      ),
      language_code: str(item.language_code ?? item.languageCode ?? "en"),
      title: str(item.title),
      subtitle: (item.subtitle ?? null) as string | null,
      baby: (item.baby ?? null) as string | null,
      stage: (item.stage ?? null) as string | null,
      mother_changes: (item.mother_changes ?? item.motherChanges ?? null) as
        | string
        | null,
      recommendations: (item.recommendations ?? null) as string | null,
      warning_signs: (item.warning_signs ?? item.warningSigns ?? null) as
        | string
        | null,
      sections: Array.isArray(item.sections) ? item.sections : [],
      created_at: str(item.created_at ?? item.createdAt),
      updated_at: str(item.updated_at ?? item.updatedAt),
    }),
  );
  return {
    ...row,
    id: str(row.id),
    week_number: num(row.week_number ?? row.weekNumber),
    trimester: num(row.trimester),
    image_note: (row.image_note ?? row.imageNote ?? null) as string | null,
    image_url: resolveBackendMediaUrl(
      (row.image_url ?? row.imageUrl ?? null) as string | null,
    ),
    is_published: Boolean(row.is_published ?? row.isPublished ?? false),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    pregnancy_week_translations: translations,
  };
}

function mapChildGrowthPeriodRow(row: Record<string, unknown>) {
  const translations = translationList(row, [
    "child_growth_period_translations",
  ]).map((item) => ({
    id: str(item.id),
    period_id: str(item.period_id ?? item.periodId ?? row.id),
    language_code: str(item.language_code ?? item.languageCode ?? "en"),
    title: str(item.title),
    subtitle: (item.subtitle ?? null) as string | null,
    growth: isPlainObject(item.growth) ? item.growth : {},
    vaccines: Array.isArray(item.vaccines) ? item.vaccines : [],
    milestones: Array.isArray(item.milestones) ? item.milestones : [],
    red_flags: Array.isArray(item.red_flags) ? item.red_flags : [],
    nutrition: Array.isArray(item.nutrition) ? item.nutrition : [],
    visit_reminders: Array.isArray(item.visit_reminders)
      ? item.visit_reminders
      : [],
    created_at: str(item.created_at ?? item.createdAt),
    updated_at: str(item.updated_at ?? item.updatedAt),
  }));
  return {
    ...row,
    id: str(row.id),
    age_months: num(row.age_months ?? row.ageMonths),
    age_label: str(row.age_label ?? row.ageLabel),
    age_group: str(row.age_group ?? row.ageGroup ?? "infant"),
    image_note: (row.image_note ?? row.imageNote ?? null) as string | null,
    growth_metrics: isPlainObject(row.growth_metrics)
      ? row.growth_metrics
      : isPlainObject(row.growthMetrics)
        ? row.growthMetrics
        : {},
    is_published: Boolean(row.is_published ?? row.isPublished ?? false),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    child_growth_period_translations: translations,
  };
}

function mapClinicalAdviceRow(row: Record<string, unknown>) {
  const translations = translationList(row, [
    "growth_clinical_advice_translations",
  ]).map((item) => ({
    id: str(item.id),
    advice_id: str(item.advice_id ?? item.adviceId ?? row.id),
    language_code: str(item.language_code ?? item.languageCode ?? "en"),
    explain_text: str(item.explain_text ?? item.explainText),
    causes: str(item.causes),
    recommendations: str(item.recommendations),
  }));
  return {
    id: str(row.id),
    code: str(row.code),
    metric: str(row.metric),
    condition: str(row.condition),
    min_age_months: num(row.min_age_months ?? row.minAgeMonths),
    max_age_months: num(row.max_age_months ?? row.maxAgeMonths),
    sort_order: num(row.sort_order ?? row.sortOrder),
    is_active: Boolean(row.is_active ?? row.isActive ?? true),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    growth_clinical_advice_translations: translations,
  };
}

function mapReferralRow(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    patientId: str(row.patient_id ?? row.patientId),
    doctorId: str(row.doctor_id ?? row.doctorId),
    referralCode: str(row.referral_code ?? row.referralCode),
    createdAt: str(row.created_at ?? row.createdAt),
    patientName: (row.patient_name ?? row.patientName ?? null) as string | null,
    patientPhone: (row.patient_phone ?? row.patientPhone ?? null) as string | null,
    doctorName: (row.doctor_name ?? row.doctorName ?? null) as string | null,
    isSubscribed: Boolean(row.is_subscribed ?? row.isSubscribed),
  };
}

function mapCommissionRow(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    referralId: str(row.referral_id ?? row.referralId),
    doctorId: str(row.doctor_id ?? row.doctorId),
    patientId: str(row.patient_id ?? row.patientId),
    paymentId: (row.payment_id ?? row.paymentId ?? null) as string | null,
    subscriptionAmount: num(row.subscription_amount ?? row.subscriptionAmount),
    commissionPercent: num(row.commission_percent ?? row.commissionPercent),
    commissionAmount: num(row.commission_amount ?? row.commissionAmount),
    currency: str(row.currency || "ETB"),
    createdAt: str(row.created_at ?? row.createdAt),
    patientName: (row.patient_name ?? row.patientName ?? null) as string | null,
    doctorName: (row.doctor_name ?? row.doctorName ?? null) as string | null,
  };
}

function mapReferralStats(row: Record<string, unknown>) {
  return {
    referralCode: (row.referral_code ?? row.referralCode ?? null) as string | null,
    referredCount: num(row.referred_count ?? row.referredCount),
    totalCommission: num(row.total_commission ?? row.totalCommission),
    currency: str(row.currency || "ETB"),
  };
}

/** Backend returns `/static/uploads/...`; absolutize so <img> hits the API host. */
function mapDoctorMedia(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    profile_photo_url: resolveBackendMediaUrl(
      (row.profile_photo_url ?? row.profilePhotoUrl ?? null) as string | null,
    ),
    license_image_url: resolveBackendMediaUrl(
      (row.license_image_url ?? row.licenseImageUrl ?? null) as string | null,
    ),
    degree_image_url: resolveBackendMediaUrl(
      (row.degree_image_url ?? row.degreeImageUrl ?? null) as string | null,
    ),
  };
}

/** ponytail: backend list ignores filters; apply admin query params in the bridge */
function filterByAdminParams<T extends { doctorId: string; createdAt: string }>(
  rows: T[],
  searchParams: URLSearchParams | undefined,
  extra?: (row: T) => boolean,
): T[] {
  if (!searchParams) return extra ? rows.filter(extra) : rows;
  const doctorId = searchParams.get("doctorId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  return rows.filter((row) => {
    if (doctorId && row.doctorId !== doctorId) return false;
    if (from && row.createdAt && row.createdAt < from) return false;
    if (to && row.createdAt && row.createdAt > to) return false;
    return extra ? extra(row) : true;
  });
}

export function adaptBackendResponse(
  adminPath: string,
  method: string,
  status: number,
  body: unknown,
  options: AdaptOptions = {},
): unknown {
  if (status >= 400) return body;

  const path = adminPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);
  const head = segments[0] ?? "";
  const rest = segments.slice(1);
  const upper = method.toUpperCase();

  if (head === "dashboard") {
    if (isPlainObject(body) && isPlainObject(body.analytics)) {
      return body;
    }
    if (!isPlainObject(body)) {
      return { range: "30d", analytics: body };
    }
    const range = options.searchParams?.get("range") || "30d";
    return adaptAdminDashboard(body, range);
  }

  if (head === "app-version-settings" && isPlainObject(body)) {
    const app = options.searchParams?.get("app") === "doctors" ? "doctors" : "mc";
    const data = isPlainObject(body.data) ? body.data : body;
    return {
      app,
      appVersionSettings: data,
      updatedAt: body.updated_at ?? null,
    };
  }

  if (head === "doctors" && rest.length === 2 && rest[1] === "push" && upper === "GET") {
    // GET maps to /admin/doctors (list). Accept bare array or { doctors: [...] }.
    const rows = Array.isArray(body)
      ? body
      : isPlainObject(body) && Array.isArray(body.doctors)
        ? body.doctors
        : null;
    if (!rows) {
      return { error: "Doctor not found", stagingNotFound: true };
    }
    const doctor = findById(rows, rest[0]);
    if (!doctor) return { error: "Doctor not found", stagingNotFound: true };
    return pushReadinessFromToken(
      doctor.fcm_token ?? doctor.fcmToken,
      doctor.notifications_enabled ?? doctor.notificationsEnabled,
    );
  }

  if (head === "users" && rest.length === 2 && rest[1] === "push" && upper === "GET") {
    const profile = isPlainObject(body)
      ? isPlainObject(body.profile)
        ? body.profile
        : body
      : null;
    if (!profile) return { error: "User not found", stagingNotFound: true };
    const readiness = pushReadinessFromToken(
      profile.fcm_token,
      profile.notifications_enabled,
    );
    return {
      ...readiness,
      role: typeof profile.role === "string" ? profile.role : null,
    };
  }

  if (head === "doctors" && rest.length === 2 && rest[1] === "booking" && upper === "PATCH") {
    if (!isPlainObject(body)) return body;
    const doctor = isPlainObject(body.doctor) ? body.doctor : body;
    const services = Array.isArray(body.services)
      ? body.services
      : Array.isArray(doctor.doctor_services)
        ? doctor.doctor_services
        : [];
    return {
      doctor: {
        ...doctor,
        doctor_services: services,
      },
    };
  }

  if (head === "doctors" && rest.length === 2 && rest[1] === "document-deliveries" && upper === "GET") {
    const rows = Array.isArray(body) ? body.filter(isPlainObject) : [];
    return {
      deliveries: rows.map((row) => ({
        id: str(row.id),
        document_id: str(row.document_id ?? row.documentId),
        recipient_type: str(row.recipient_type ?? row.recipientType ?? "doctor"),
        recipient_id: str(row.recipient_id ?? row.recipientId),
        sent_by: (row.sent_by ?? row.sentBy ?? null) as string | null,
        sent_at: str(row.sent_at ?? row.sentAt),
        acknowledged_at: (row.acknowledged_at ?? row.acknowledgedAt ?? null) as string | null,
        // ponytail: backend list has no joined doc titles yet
        document_title: (row.document_title ?? null) as string | null,
        document_category: (row.document_category ?? null) as string | null,
        file_name: (row.file_name ?? null) as string | null,
      })),
    };
  }

  if (head === "doctors" && rest.length === 2 && rest[1] === "referral-stats" && upper === "GET") {
    if (!isPlainObject(body)) return body;
    return { stats: mapReferralStats(body) };
  }

  if (head === "doctors" && rest.length === 1 && upper === "GET") {
    // Public DoctorDetailOut: { doctor, services, slots }
    if (isPlainObject(body) && isPlainObject(body.doctor)) {
      const services = Array.isArray(body.services) ? body.services : [];
      const slots = Array.isArray(body.slots) ? body.slots : [];
      const doctor = mapDoctorMedia(body.doctor);
      return {
        doctor: {
          ...doctor,
          doctor_services: doctor.doctor_services ?? services,
          doctor_availability_slots:
            doctor.doctor_availability_slots ?? slots,
        },
      };
    }
    if (!Array.isArray(body)) {
      return isPlainObject(body) ? { doctor: mapDoctorMedia(body) } : body;
    }
    const doctor = findById(body, rest[0]);
    if (!doctor) return { error: "Doctor not found", stagingNotFound: true };
    return { doctor: mapDoctorMedia(doctor) };
  }

  if (
    head === "doctors" &&
    rest.length === 2 &&
    rest[1] === "document-deliveries" &&
    upper === "POST"
  ) {
    return { ok: true, delivery: body, ...(isPlainObject(body) ? body : {}) };
  }

  if (head === "activity-logs" && rest.length === 2 && upper === "GET") {
    if (!Array.isArray(body)) {
      return isPlainObject(body) ? { log: body } : body;
    }
    const log = findById(body, rest[1]);
    if (!log) return { error: "Activity log not found", stagingNotFound: true };
    return { log: { ...log, source: rest[0] } };
  }

  if (head === "appointments" && rest.length === 1 && rest[0] !== "stats" && upper === "GET") {
    if (isPlainObject(body) && "appointment" in body) {
      return {
        appointment: body.appointment,
        conversation: body.conversation ?? null,
        messages: Array.isArray(body.messages) ? body.messages : [],
      };
    }
    if (!Array.isArray(body)) {
      return isPlainObject(body)
        ? { appointment: body, conversation: null, messages: [] }
        : body;
    }
    const appointment = findById(body, rest[0]);
    if (!appointment) return { error: "Appointment not found", stagingNotFound: true };
    return { appointment, conversation: null, messages: [] };
  }

  if (head === "appointments" && rest.length === 1 && upper === "PATCH") {
    return isPlainObject(body) ? { appointment: body } : body;
  }

  if (head === "admins" && upper === "PATCH") {
    return isPlainObject(body) ? { admin: body } : body;
  }

  if (head === "documents" && upper === "POST" && rest.length === 0) {
    return isPlainObject(body) ? { document: body } : body;
  }

  if (head === "payout-requests" && rest.length === 1 && upper === "GET") {
    if (!Array.isArray(body)) {
      return isPlainObject(body) ? { request: body, context: null } : body;
    }
    const request = findById(body, rest[0]);
    if (!request) return { error: "Payout request not found", stagingNotFound: true };
    return { request, context: null };
  }

  if (head === "children" && rest.length === 1 && upper === "GET") {
    // Staging returns a bare child row; prod API returns the full detail envelope.
    if (isPlainObject(body) && isPlainObject(body.child)) {
      return {
        child: body.child,
        milestoneChecks: Array.isArray(body.milestoneChecks) ? body.milestoneChecks : [],
        measurements: Array.isArray(body.measurements) ? body.measurements : [],
        vaccineRecords: Array.isArray(body.vaccineRecords) ? body.vaccineRecords : [],
        vaccineSchedule: Array.isArray(body.vaccineSchedule) ? body.vaccineSchedule : [],
        growthPeriods: Array.isArray(body.growthPeriods) ? body.growthPeriods : [],
      };
    }
    if (isPlainObject(body) && body.id != null) {
      return {
        child: body,
        milestoneChecks: [],
        measurements: [],
        vaccineRecords: [],
        vaccineSchedule: [],
        growthPeriods: [],
      };
    }
    if (Array.isArray(body)) {
      const child = findById(body, rest[0]);
      if (!child) return { error: "Child not found", stagingNotFound: true };
      return {
        child,
        milestoneChecks: [],
        measurements: [],
        vaccineRecords: [],
        vaccineSchedule: [],
        growthPeriods: [],
      };
    }
    return body;
  }

  if (Array.isArray(body)) {
    switch (head) {
      case "doctors":
        return {
          doctors: body.filter(isPlainObject).map(mapDoctorMedia),
        };
      case "appointments":
        if (rest[0] === "stats") {
          return deriveAppointmentStats(body);
        }
        return { appointments: body };
      case "hospitals": {
        const hospitals = body.filter(isPlainObject).map((row) => ({
          ...row,
          image_url: resolveBackendMediaUrl(
            (row.image_url ?? row.imageUrl ?? null) as string | null,
          ),
        }));
        return upper === "POST"
          ? { hospital: hospitals[0] ?? body }
          : { hospitals };
      }
      case "doctor-categories":
        return {
          categories: body.filter(isPlainObject).map((row) => ({
            ...row,
            image_url: resolveBackendMediaUrl(
              (row.image_url ?? row.imageUrl ?? null) as string | null,
            ),
          })),
        };
      case "users":
        return rest.length === 1 ? { profile: body[0] ?? body } : { profiles: body };
      case "documents":
        return { documents: body };
      case "payout-requests":
        return { requests: body };
      case "wallet-transactions":
        return { transactions: body };
      case "admins":
        return { admins: body };
      case "app-membership-members":
        return { members: body, subscriptions: body };
      case "activity-logs":
        return { logs: body };
      case "activity":
        return { logs: body };
      case "legal-documents":
        return { documents: body };
      case "pregnancy-weeks": {
        const weeks = body.filter(isPlainObject).map(mapPregnancyWeekRow);
        return { weeks, items: weeks };
      }
      case "child-growth": {
        const periods = body.filter(isPlainObject).map(mapChildGrowthPeriodRow);
        return { periods, items: periods };
      }
      case "clinical-advice": {
        const items = body.filter(isPlainObject).map(mapClinicalAdviceRow);
        return { items, advice: items };
      }
      case "followup-visits":
        return { templates: body, items: body };
      case "referrals": {
        const mapped = body
          .filter(isPlainObject)
          .map(mapReferralRow);
        const subscribed = options.searchParams?.get("subscribed");
        return {
          referrals: filterByAdminParams(mapped, options.searchParams, (row) => {
            if (subscribed === "yes") return row.isSubscribed;
            if (subscribed === "no") return !row.isSubscribed;
            return true;
          }),
        };
      }
      case "referral-commissions": {
        const mapped = body.filter(isPlainObject).map(mapCommissionRow);
        return { commissions: filterByAdminParams(mapped, options.searchParams) };
      }
      case "children":
        return { children: body, items: body };
      case "daily-tips": {
        const tips = body.filter(isPlainObject).map(mapDailyTipRow);
        return { tips, items: tips };
      }
      default:
        return { items: body, data: body };
    }
  }

  if (isPlainObject(body)) {
    if (head === "doctors" && (rest[1] === "verify" || rest.length === 1)) {
      const doctor = mapDoctorMedia(body);
      return { doctor, ...doctor };
    }
    if (head === "doctor-categories" && rest.length === 1) {
      return {
        category: {
          ...body,
          image_url: resolveBackendMediaUrl(
            (body.image_url ?? body.imageUrl ?? null) as string | null,
          ),
        },
      };
    }
    if (head === "hospitals" && (upper === "POST" || rest.length === 1)) {
      return {
        hospital: {
          ...body,
          image_url: resolveBackendMediaUrl(
            (body.image_url ?? body.imageUrl ?? null) as string | null,
          ),
        },
      };
    }
    if (head === "users" && rest.length === 1) {
      if ("profile" in body || "pregnancies" in body || "children" in body) {
        return {
          profile: body.profile ?? body,
          pregnancies: Array.isArray(body.pregnancies) ? body.pregnancies : [],
          children: Array.isArray(body.children) ? body.children : [],
          logsByPregnancy: {},
          user: body.profile ?? body,
        };
      }
      return { profile: body, user: body, pregnancies: [], children: [], logsByPregnancy: {} };
    }
    if (head === "payout-requests" && rest.length === 1) {
      return { request: body, ...body };
    }
    if (head === "admins" && upper === "POST") {
      return { admin: body };
    }
    if (head === "doctor-categories" && (upper === "POST" || rest.length === 1)) {
      return { category: body };
    }
    if (head === "daily-tips") {
      const tip = mapDailyTipRow(body);
      return { tip, tips: [tip], items: [tip] };
    }
    if (head === "pregnancy-weeks") {
      const week = mapPregnancyWeekRow(body);
      return { week, weeks: [week], items: [week] };
    }
    if (head === "child-growth") {
      const period = mapChildGrowthPeriodRow(body);
      return { period, periods: [period], items: [period] };
    }
    if (head === "clinical-advice") {
      const item = mapClinicalAdviceRow(body);
      return { item, items: [item], advice: [item] };
    }
    if (head === "followup-visits") {
      return { template: body, templates: [body], items: [body] };
    }
    if (head === "app-membership-settings") {
      return {
        appMembershipSettings: parseAppMembershipSettingsData(body.data ?? body),
        updatedAt: body.updated_at ?? null,
      };
    }
    if (head === "referral-settings") {
      const data = isPlainObject(body.data) ? body.data : body;
      return {
        referralSettings: {
          commissionPercent: num(
            data.commissionPercent ?? data.commission_percent ?? 20,
          ),
        },
        updatedAt: body.updated_at ?? null,
      };
    }
    if (head === "finance-settings") {
      return { financeSettings: body.data ?? body, ...body };
    }
    if (head === "legal-documents" && (upper === "PATCH" || upper === "PUT")) {
      return { document: body };
    }
    if (head === "documents" && rest[1] === "deliver" && upper === "POST") {
      return { ok: true, delivery: body, ...(isPlainObject(body) ? body : {}) };
    }
    if (head === "payment-settings") {
      return { paymentSettings: body.data ?? body, ...body };
    }
    if (head === "app-membership-members") {
      return { members: Array.isArray(body.members) ? body.members : body };
    }
    if (head === "users" && rest[1] === "push" && upper === "POST") {
      return { ok: true, ...body };
    }
    if (head === "doctors" && rest[1] === "push" && upper === "POST") {
      return { ok: true, ...body };
    }
  }

  return body;
}

export function deriveAppointmentStats(
  appointments: unknown[],
): { total: number; pending: number; confirmed: number; completed: number; cancelled: number } {
  const counts = {
    total: appointments.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of appointments) {
    if (!isPlainObject(row)) continue;
    const status = String(row.status ?? "");
    if (status === "pending") counts.pending += 1;
    else if (status === "confirmed") counts.confirmed += 1;
    else if (status === "completed") counts.completed += 1;
    else if (status === "cancelled") counts.cancelled += 1;
  }
  return counts;
}
