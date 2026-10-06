/**
 * Normalize Render staging responses into the shapes existing admin UI expects.
 */

import { parseAppMembershipSettingsData } from "../appMembership/subscriptionSettings.ts";
import { resolveBackendMediaUrl } from "./config.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function mapChildProfile(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    id: (row.id ?? null) as string | null,
    phone: (row.phone ?? null) as string | null,
    locale: (row.locale ?? null) as string | null,
    full_name: (row.full_name ?? row.fullName ?? null) as string | null,
    created_at: (row.created_at ?? row.createdAt ?? null) as string | null,
    account_type: (row.account_type ?? row.accountType ?? null) as string | null,
    onboarding_complete: Boolean(
      row.onboarding_complete ?? row.onboardingComplete ?? false,
    ),
    notifications_enabled:
      row.notifications_enabled ?? row.notificationsEnabled ?? true,
  };
}

function mapChildRow(row: Record<string, unknown>) {
  const profilesRaw = isPlainObject(row.profiles) ? row.profiles : null;
  return {
    id: str(row.id),
    user_id: str(row.user_id ?? row.userId),
    pregnancy_id: (row.pregnancy_id ?? row.pregnancyId ?? null) as string | null,
    local_id: (row.local_id ?? row.localId ?? null) as string | null,
    name: str(row.name),
    gender: str(row.gender),
    birth_date: str(row.birth_date ?? row.birthDate),
    birth_weight: (row.birth_weight ?? row.birthWeight ?? null) as number | null,
    birth_height: (row.birth_height ?? row.birthHeight ?? null) as number | null,
    delivery_type: (row.delivery_type ?? row.deliveryType ?? null) as string | null,
    is_active: Boolean(row.is_active ?? row.isActive ?? true),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    gestational_age_weeks: (row.gestational_age_weeks ??
      row.gestationalAgeWeeks ??
      null) as number | null,
    gestational_age_days: (row.gestational_age_days ??
      row.gestationalAgeDays ??
      null) as number | null,
    birth_hospital: (row.birth_hospital ??
      row.birthHospital ??
      null) as string | null,
    blood_group: (row.blood_group ?? row.bloodGroup ?? null) as string | null,
    woreda: (row.woreda ?? null) as string | null,
    photo_url: resolveBackendMediaUrl(
      (row.photo_url ?? row.photoUrl ?? null) as string | null,
    ),
    profiles: mapChildProfile(profilesRaw),
  };
}

function mapActivityLog(
  row: Record<string, unknown>,
  sourceHint?: string | null,
) {
  const actorRole = (row.actor_role ?? row.actorRole ?? null) as string | null;
  const actorTypeRaw = (row.actor_type ?? row.actorType ?? null) as string | null;
  const inferred =
    row.source === "admin" || row.source === "platform"
      ? row.source
      : actorRole != null || actorTypeRaw === "admin"
        ? "admin"
        : "platform";
  const source =
    sourceHint === "admin" || sourceHint === "platform" ? sourceHint : inferred;
  return {
    id: str(row.id),
    source,
    actor_id: (row.actor_id ?? row.actorId ?? null) as string | null,
    actor_email: (row.actor_email ?? row.actorEmail ?? null) as string | null,
    actor_name: (row.actor_name ?? row.actorName ?? null) as string | null,
    actor_role: actorRole,
    actor_type: (actorTypeRaw ?? (source === "admin" ? "admin" : null)) as
      | string
      | null,
    event_type: str(row.event_type ?? row.eventType),
    event_label: str(row.event_label ?? row.eventLabel),
    resource_type: (row.resource_type ?? row.resourceType ?? null) as string | null,
    resource_id: (row.resource_id ?? row.resourceId ?? null) as string | null,
    metadata: isPlainObject(row.metadata) ? row.metadata : {},
    ip_address: (row.ip_address ?? row.ipAddress ?? null) as string | null,
    user_agent: (row.user_agent ?? row.userAgent ?? null) as string | null,
    created_at: str(row.created_at ?? row.createdAt),
  };
}

function activityLogRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (isPlainObject(body) && Array.isArray(body.logs)) {
    return body.logs.filter(isPlainObject);
  }
  return [];
}

function childListRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (isPlainObject(body) && Array.isArray(body.children)) {
    return body.children.filter(isPlainObject);
  }
  if (isPlainObject(body) && Array.isArray(body.items)) {
    return body.items.filter(isPlainObject);
  }
  return [];
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
    if (isPlainObject(body) && "analytics" in body) return body;
    return { range: "30d", analytics: body };
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
    const sourceHint = rest[0] === "platform" ? "platform" : "admin";
    if (isPlainObject(body) && !Array.isArray(body) && body.id != null) {
      return { log: mapActivityLog(body, sourceHint) };
    }
    const rows = activityLogRows(body);
    const log = findById(rows, rest[1]);
    if (!log) return { error: "Activity log not found", stagingNotFound: true };
    return { log: mapActivityLog(log, sourceHint) };
  }

  if (head === "activity-logs" && rest.length === 0 && upper === "GET") {
    const sourceHint = options.searchParams?.get("source");
    const eventType = options.searchParams?.get("event_type");
    const actorType = options.searchParams?.get("actor_type");
    let logs = activityLogRows(body).map((row) =>
      mapActivityLog(
        row,
        sourceHint === "admin" || sourceHint === "platform" ? sourceHint : null,
      ),
    );
    if (eventType) logs = logs.filter((row) => row.event_type === eventType);
    if (actorType) logs = logs.filter((row) => row.actor_type === actorType);
    return { logs };
  }

  if (head === "children" && rest.length === 0 && upper === "GET") {
    const children = childListRows(body).map(mapChildRow);
    return { children, items: children };
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
        child: mapChildRow(body.child),
        milestoneChecks: Array.isArray(body.milestoneChecks) ? body.milestoneChecks : [],
        measurements: Array.isArray(body.measurements) ? body.measurements : [],
        vaccineRecords: Array.isArray(body.vaccineRecords) ? body.vaccineRecords : [],
        vaccineSchedule: Array.isArray(body.vaccineSchedule) ? body.vaccineSchedule : [],
        growthPeriods: Array.isArray(body.growthPeriods) ? body.growthPeriods : [],
      };
    }
    if (isPlainObject(body) && body.id != null) {
      return {
        child: mapChildRow(body),
        milestoneChecks: [],
        measurements: [],
        vaccineRecords: [],
        vaccineSchedule: [],
        growthPeriods: [],
      };
    }
    const rows = childListRows(body);
    if (rows.length > 0) {
      const child = findById(rows, rest[0]);
      if (!child) return { error: "Child not found", stagingNotFound: true };
      return {
        child: mapChildRow(child),
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
        return {
          logs: body.map((row) =>
            mapActivityLog(isPlainObject(row) ? row : {}, null),
          ),
        };
      case "activity":
        return {
          logs: body.map((row) =>
            mapActivityLog(isPlainObject(row) ? row : {}, "platform"),
          ),
        };
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
      case "children": {
        const children = body.filter(isPlainObject).map(mapChildRow);
        return { children, items: children };
      }
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
