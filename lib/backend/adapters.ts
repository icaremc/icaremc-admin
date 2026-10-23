/**
 * Normalize Render staging responses into the shapes existing admin UI expects.
 */

import {
  normalizeSubscriptionStatus,
  subscriptionHasAccess,
  type AppSubscriptionStatus,
} from "../appMembership/members.ts";
import { parseAppMembershipSettingsData } from "../appMembership/subscriptionSettings.ts";
import { parseFinanceSettings } from "../payment/financeSettings.ts";
import { parseProfilePaymentSettings } from "../payment/profilePaymentSettings.ts";
import { resolveBackendMediaUrl } from "./config.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function groupUserDetailLogs(
  body: Record<string, unknown>,
): Record<string, unknown[]> {
  const byKey =
    body.logsByPregnancy ?? body.logs_by_pregnancy ?? body.pregnancy_logs_by_id;
  if (isPlainObject(byKey)) {
    const out: Record<string, unknown[]> = {};
    for (const [key, value] of Object.entries(byKey)) {
      if (Array.isArray(value)) out[key] = value;
    }
    return out;
  }
  const flat =
    body.pregnancy_logs ?? body.pregnancyLogs ?? body.logs ?? body.health_logs;
  if (!Array.isArray(flat)) return {};
  const out: Record<string, unknown[]> = {};
  for (const row of flat) {
    if (!isPlainObject(row)) continue;
    const pregnancyId = String(row.pregnancy_id ?? row.pregnancyId ?? "").trim();
    if (!pregnancyId) continue;
    out[pregnancyId] ??= [];
    out[pregnancyId].push(row);
  }
  return out;
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

function byNum(a: unknown, b: unknown): number {
  return num(a) - num(b);
}

function bySortOrderThenName(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): number {
  const order =
    byNum(a.sort_order ?? a.sortOrder, b.sort_order ?? b.sortOrder);
  if (order !== 0) return order;
  return str(a.name).localeCompare(str(b.name));
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
  const fromNested = translationList(row, [
    "child_growth_period_translations",
    "childGrowthPeriodTranslations",
  ]);
  // CMS shape: single `translation` per lang response — already folded into nested list by proxy
  const translations = (
    fromNested.length > 0
      ? fromNested
      : isPlainObject(row.translation)
        ? [row.translation]
        : []
  ).map((item) => ({
    id: str(item.id),
    period_id: str(item.period_id ?? item.periodId ?? row.id),
    language_code: str(item.language_code ?? item.languageCode ?? "en"),
    title: str(item.title),
    subtitle: (item.subtitle ?? null) as string | null,
    growth: isPlainObject(item.growth) ? item.growth : {},
    vaccines: Array.isArray(item.vaccines) ? item.vaccines : [],
    milestones: Array.isArray(item.milestones) ? item.milestones : [],
    red_flags: Array.isArray(item.red_flags ?? item.redFlags)
      ? ((item.red_flags ?? item.redFlags) as unknown[])
      : [],
    nutrition: Array.isArray(item.nutrition) ? item.nutrition : [],
    visit_reminders: Array.isArray(item.visit_reminders ?? item.visitReminders)
      ? ((item.visit_reminders ?? item.visitReminders) as unknown[])
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
  const fullName = (row.full_name ??
    row.fullName ??
    row.name ??
    null) as string | null;
  return {
    id: (row.id ?? null) as string | null,
    phone: (row.phone ?? null) as string | null,
    locale: (row.locale ?? null) as string | null,
    full_name: fullName,
    created_at: (row.created_at ?? row.createdAt ?? null) as string | null,
    account_type: (row.account_type ?? row.accountType ?? null) as string | null,
    onboarding_complete: Boolean(
      row.onboarding_complete ?? row.onboardingComplete ?? false,
    ),
    notifications_enabled:
      row.notifications_enabled ?? row.notificationsEnabled ?? true,
  };
}

/** Parent profile from nested/flat child fields, or null. */
function childParentProfile(row: Record<string, unknown>) {
  if (isPlainObject(row.profiles)) return mapChildProfile(row.profiles);
  if (isPlainObject(row.parent)) return mapChildProfile(row.parent);
  if (isPlainObject(row.user)) return mapChildProfile(row.user);
  if (isPlainObject(row.profile)) return mapChildProfile(row.profile);
  const flatName = row.parent_name ?? row.parentName ?? row.full_name ?? row.fullName;
  const flatPhone = row.parent_phone ?? row.parentPhone;
  if (flatName != null || flatPhone != null) {
    return mapChildProfile({
      id: row.user_id ?? row.userId ?? null,
      full_name: flatName,
      phone: flatPhone,
    });
  }
  return null;
}

function membershipListRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (!isPlainObject(body)) return [];
  for (const key of ["members", "subscriptions", "items", "data"] as const) {
    const rows = body[key];
    if (Array.isArray(rows)) return rows.filter(isPlainObject);
  }
  return [];
}

function mapMembershipMember(row: Record<string, unknown>) {
  const profile = isPlainObject(row.profiles)
    ? row.profiles
    : isPlainObject(row.profile)
      ? row.profile
      : isPlainObject(row.patient)
        ? row.patient
        : isPlainObject(row.user)
          ? row.user
          : isPlainObject(row.mother)
            ? row.mother
            : null;
  const statusRaw = normalizeSubscriptionStatus(
    (row.status ?? null) as string | null,
  );
  const status = (
    statusRaw === "active" ||
    statusRaw === "expired" ||
    statusRaw === "cancelled"
      ? statusRaw
      : "expired"
  ) as AppSubscriptionStatus;
  const endsAt = str(row.ends_at ?? row.endsAt);
  const hasAccessExplicit = row.has_access ?? row.hasAccess;
  const has_access =
    typeof hasAccessExplicit === "boolean"
      ? hasAccessExplicit
      : subscriptionHasAccess(status, endsAt);

  const rawName =
    row.patient_name ??
    row.patientName ??
    row.parent_name ??
    row.parentName ??
    row.full_name ??
    row.fullName ??
    profile?.full_name ??
    profile?.fullName ??
    profile?.name ??
    null;
  const rawPhone =
    row.patient_phone ??
    row.patientPhone ??
    row.parent_phone ??
    row.parentPhone ??
    profile?.phone ??
    null;
  const patient_name =
    typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;
  const patient_phone =
    typeof rawPhone === "string" && rawPhone.trim() ? rawPhone.trim() : null;

  return {
    id: str(row.id),
    patient_id: str(
      row.patient_id ?? row.patientId ?? row.user_id ?? row.userId,
    ),
    plan: str(row.plan ?? "yearly"),
    status,
    starts_at: str(row.starts_at ?? row.startsAt),
    ends_at: endsAt,
    amount_paid: num(row.amount_paid ?? row.amountPaid),
    currency: str(row.currency || "ETB"),
    payment_method: (row.payment_method ?? row.paymentMethod ?? null) as
      | string
      | null,
    chapa_tx_ref: (row.chapa_tx_ref ?? row.chapaTxRef ?? null) as string | null,
    admin_receipt_url: resolveBackendMediaUrl(
      (row.admin_receipt_url ?? row.adminReceiptUrl ?? null) as string | null,
    ),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    patient_name,
    patient_phone,
    has_access,
  };
}

function mapChildRow(row: Record<string, unknown>) {
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
    profiles: childParentProfile(row),
  };
}

function childDetailRows(
  body: unknown,
  keys: string[],
): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (!isPlainObject(body)) return [];
  for (const key of keys) {
    const rows = body[key];
    if (Array.isArray(rows)) return rows.filter(isPlainObject);
  }
  return [];
}

function mapChildMeasurementRow(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    user_id: str(row.user_id ?? row.userId),
    child_local_id: str(row.child_local_id ?? row.childLocalId),
    measured_on: str(row.measured_on ?? row.measuredOn),
    age_months: (row.age_months ?? row.ageMonths ?? null) as number | null,
    weight_kg: (row.weight_kg ?? row.weightKg ?? null) as number | null,
    height_cm: (row.height_cm ?? row.heightCm ?? null) as number | null,
    head_circumference_cm: (row.head_circumference_cm ??
      row.headCircumferenceCm ??
      null) as number | null,
    notes: (row.notes ?? null) as string | null,
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
  };
}

function mapChildMilestoneRow(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    user_id: str(row.user_id ?? row.userId),
    child_local_id: str(row.child_local_id ?? row.childLocalId),
    item_key: str(row.item_key ?? row.itemKey),
    created_at: str(row.created_at ?? row.createdAt),
  };
}

function mapChildVaccineRow(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    user_id: str(row.user_id ?? row.userId),
    child_local_id: str(row.child_local_id ?? row.childLocalId),
    vaccine_key: str(row.vaccine_key ?? row.vaccineKey),
    vaccine_name: str(row.vaccine_name ?? row.vaccineName),
    age_months: (row.age_months ?? row.ageMonths ?? null) as number | null,
    received: Boolean(row.received ?? false),
    date_received: (row.date_received ?? row.dateReceived ?? null) as
      | string
      | null,
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
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

function listPageMeta(
  body: unknown,
  searchParams: URLSearchParams | undefined,
  rowCount: number,
) {
  const offset = Number(searchParams?.get("offset") ?? 0) || 0;
  const limit = Number(searchParams?.get("limit") ?? 50) || 50;
  if (isPlainObject(body) && isPlainObject(body.pagination)) {
    const p = body.pagination;
    const total = Number(p.total) || 0;
    const pageOffset = Number(p.offset) || offset;
    const pageLimit = Number(p.limit) || limit;
    return {
      total,
      offset: pageOffset,
      limit: pageLimit,
      hasMore: pageOffset + rowCount < total,
    };
  }
  return {
    total: null as number | null,
    offset,
    limit,
    hasMore: rowCount >= limit,
  };
}

function appointmentListRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (!isPlainObject(body)) return [];
  for (const key of ["appointments", "items", "data"] as const) {
    const rows = body[key];
    if (Array.isArray(rows)) return rows.filter(isPlainObject);
  }
  return [];
}

/** Match Supabase GET: appointment_date desc, time_slot asc. */
function byAppointmentDateDesc(
  a: { appointment_date?: string; time_slot?: string },
  b: { appointment_date?: string; time_slot?: string },
): number {
  const byDate = str(b.appointment_date).localeCompare(str(a.appointment_date));
  if (byDate !== 0) return byDate;
  return str(a.time_slot).localeCompare(str(b.time_slot));
}

function mapAppointmentDoctorProfiles(row: Record<string, unknown>) {
  const nested = isPlainObject(row.doctor_profiles)
    ? row.doctor_profiles
    : isPlainObject(row.doctorProfiles)
      ? row.doctorProfiles
      : isPlainObject(row.doctor)
        ? row.doctor
        : null;
  if (nested) {
    const first = str(nested.first_name ?? nested.firstName);
    const last = str(nested.last_name ?? nested.lastName);
    if (first || last) {
      return {
        first_name: first,
        last_name: last,
        specialty: str(
          nested.specialty ?? nested.speciality ?? nested.category ?? "",
        ),
        hospital: str(nested.hospital ?? ""),
      };
    }
  }

  const first = str(row.doctor_first_name ?? row.doctorFirstName);
  const last = str(row.doctor_last_name ?? row.doctorLastName);
  if (first || last) {
    return {
      first_name: first,
      last_name: last,
      specialty: str(row.doctor_specialty ?? row.doctorSpecialty ?? ""),
      hospital: str(row.doctor_hospital ?? row.doctorHospital ?? ""),
    };
  }

  const full = str(row.doctor_name ?? row.doctorName).replace(/^Dr\.?\s*/i, "").trim();
  if (!full) return null;
  const parts = full.split(/\s+/);
  return {
    first_name: parts[0] ?? full,
    last_name: parts.slice(1).join(" "),
    specialty: str(row.doctor_specialty ?? row.doctorSpecialty ?? ""),
    hospital: str(row.doctor_hospital ?? row.doctorHospital ?? ""),
  };
}

function mapAppointmentRow(row: Record<string, unknown>) {
  const profilesRaw = isPlainObject(row.profiles)
    ? row.profiles
    : isPlainObject(row.patient)
      ? row.patient
      : isPlainObject(row.user)
        ? row.user
        : null;
  const patient_name =
    (typeof row.patient_name === "string" && row.patient_name.trim()
      ? row.patient_name.trim()
      : typeof row.patientName === "string" && row.patientName.trim()
        ? row.patientName.trim()
        : typeof profilesRaw?.full_name === "string"
          ? profilesRaw.full_name
          : typeof profilesRaw?.fullName === "string"
            ? profilesRaw.fullName
            : null) as string | null;
  const patient_phone =
    (typeof row.patient_phone === "string" && row.patient_phone.trim()
      ? row.patient_phone.trim()
      : typeof row.patientPhone === "string" && row.patientPhone.trim()
        ? row.patientPhone.trim()
        : typeof profilesRaw?.phone === "string"
          ? profilesRaw.phone
          : null) as string | null;

  return {
    ...row,
    id: str(row.id),
    doctor_id: str(row.doctor_id ?? row.doctorId),
    patient_id: str(row.patient_id ?? row.patientId),
    appointment_date: str(row.appointment_date ?? row.appointmentDate),
    time_slot: str(row.time_slot ?? row.timeSlot),
    status: str(row.status),
    note: (row.note ?? null) as string | null,
    patient_name,
    patient_phone,
    service_id: (row.service_id ?? row.serviceId ?? null) as string | null,
    service_name: (row.service_name ?? row.serviceName ?? null) as string | null,
    service_description: (row.service_description ??
      row.serviceDescription ??
      null) as string | null,
    service_price:
      row.service_price != null || row.servicePrice != null
        ? num(row.service_price ?? row.servicePrice)
        : null,
    currency: str(row.currency || "ETB"),
    total_amount: num(row.total_amount ?? row.totalAmount),
    amount_paid: num(row.amount_paid ?? row.amountPaid),
    payment_status: str(
      (row.payment_status ?? row.paymentStatus ?? "unpaid") as string,
    ),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    doctor_profiles: mapAppointmentDoctorProfiles(row),
    profiles: profilesRaw
      ? {
          full_name: (profilesRaw.full_name ??
            profilesRaw.fullName ??
            null) as string | null,
          phone: (profilesRaw.phone ?? null) as string | null,
        }
      : patient_name || patient_phone
        ? { full_name: patient_name, phone: patient_phone }
        : null,
  };
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

/** Settings APIs return `{ data }` or the already-shaped admin envelope. */
function settingsData(
  body: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const nested = body[key];
  if (isPlainObject(nested)) return nested;
  if (isPlainObject(body.data)) return body.data;
  return body;
}

function settingsUpdatedAt(body: Record<string, unknown>): string | null {
  const value = body.updatedAt ?? body.updated_at ?? null;
  return value == null ? null : String(value);
}

function mapDocumentRow(row: Record<string, unknown>) {
  const storage_path = str(row.storage_path ?? row.storagePath);
  const previewRaw = (row.preview_url ?? row.previewUrl ?? null) as string | null;
  return {
    id: str(row.id),
    title: str(row.title),
    category: str(row.category || "other"),
    storage_path,
    file_name: str(row.file_name ?? row.fileName),
    mime_type: str(row.mime_type ?? row.mimeType ?? "application/pdf"),
    uploaded_by: (row.uploaded_by ?? row.uploadedBy ?? null) as string | null,
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    preview_url:
      resolveBackendMediaUrl(previewRaw) ??
      (storage_path ? resolveBackendMediaUrl(storage_path) : null),
  };
}

function splitDoctorDisplayName(name: string): {
  first_name: string;
  last_name: string;
} {
  const trimmed = name.trim();
  if (!trimmed) return { first_name: "Doctor", last_name: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0] ?? trimmed, last_name: "" };
  return {
    first_name: parts[0] ?? trimmed,
    last_name: parts.slice(1).join(" "),
  };
}

function mapPayoutMethodReview(
  row: Record<string, unknown> | null,
  doctorId: string,
) {
  if (!row) return null;
  return {
    id: str(row.id),
    doctor_id: str(row.doctor_id ?? row.doctorId) || doctorId,
    holder_name: str(row.holder_name ?? row.holderName),
    account_number: str(row.account_number ?? row.accountNumber),
    bank_name: str(row.bank_name ?? row.bankName),
    bank_code: (row.bank_code ?? row.bankCode ?? null) as string | null,
    swift_code: (row.swift_code ?? row.swiftCode ?? null) as string | null,
    is_active: row.is_active !== false && row.isActive !== false,
    is_default: Boolean(row.is_default ?? row.isDefault ?? true),
    currency: str(row.currency || "ETB"),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
  };
}

function mapPaymentMethodRow(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    doctor_id: (row.doctor_id ?? row.doctorId ?? null) as string | null,
    patient_id: (row.patient_id ?? row.patientId ?? null) as string | null,
    user_id: (row.user_id ?? row.userId ?? null) as string | null,
    holder_name: str(row.holder_name ?? row.holderName),
    account_number: str(row.account_number ?? row.accountNumber),
    bank_name: str(row.bank_name ?? row.bankName),
    bank_code: (row.bank_code ?? row.bankCode ?? null) as string | null,
    swift_code: (row.swift_code ?? row.swiftCode ?? null) as string | null,
    is_active: row.is_active !== false && row.isActive !== false,
    is_default: Boolean(row.is_default ?? row.isDefault ?? false),
    currency: str(row.currency || "ETB"),
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
  };
}

function paymentMethodListRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (isPlainObject(body) && Array.isArray(body.methods)) {
    return body.methods.filter(isPlainObject);
  }
  if (isPlainObject(body) && Array.isArray(body.items)) {
    return body.items.filter(isPlainObject);
  }
  return [];
}

/** OpenAPI PayoutReviewOut → admin payout detail { request, context }. */
function mapPayoutReviewOut(body: Record<string, unknown>) {
  const rawRequest = isPlainObject(body.request) ? body.request : body;
  const doctor = isPlainObject(body.doctor) ? body.doctor : null;
  const wallet = isPlainObject(body.wallet) ? body.wallet : null;
  const thisMonth = isPlainObject(body.this_month)
    ? body.this_month
    : isPlainObject(body.thisMonth)
      ? body.thisMonth
      : null;
  const doctorId = str(rawRequest.doctor_id ?? rawRequest.doctorId ?? doctor?.id);
  const names = splitDoctorDisplayName(str(doctor?.name ?? ""));
  const method = mapPayoutMethodReview(
    isPlainObject(rawRequest.payout_method)
      ? rawRequest.payout_method
      : isPlainObject(rawRequest.payoutMethod)
        ? rawRequest.payoutMethod
        : isPlainObject(body.payout_method)
          ? body.payout_method
          : isPlainObject(body.payoutMethod)
            ? body.payoutMethod
            : null,
    doctorId,
  );

  const request = {
    id: str(rawRequest.id),
    doctor_id: doctorId,
    payout_method_id:
      str(rawRequest.payout_method_id ?? rawRequest.payoutMethodId) ||
      method?.id ||
      null,
    amount: num(rawRequest.amount),
    note: (rawRequest.doctor_note ??
      rawRequest.doctorNote ??
      rawRequest.note ??
      null) as string | null,
    admin_note: (rawRequest.admin_note ?? rawRequest.adminNote ?? null) as
      | string
      | null,
    status: str(rawRequest.status || "pending"),
    created_at: str(rawRequest.created_at ?? rawRequest.createdAt),
    payment_date: (rawRequest.payment_date ??
      rawRequest.paymentDate ??
      null) as string | null,
    updated_at: str(
      rawRequest.updated_at ?? rawRequest.updatedAt ?? rawRequest.created_at,
    ),
    doctor_profiles: doctor
      ? {
          first_name: names.first_name,
          last_name: names.last_name,
          phone: (doctor.phone ?? null) as string | null,
        }
      : null,
    doctor_payout_methods: method,
  };

  const historyRaw = Array.isArray(body.payout_history)
    ? body.payout_history
    : Array.isArray(body.payoutHistory)
      ? body.payoutHistory
      : [];
  const payoutHistory = historyRaw.filter(isPlainObject).map((row) => ({
    id: str(row.id),
    doctor_id: doctorId,
    payout_method_id: null,
    amount: num(row.amount),
    note: (row.note ?? null) as string | null,
    admin_note: (row.admin_note ?? row.adminNote ?? null) as string | null,
    status: str(row.status || "pending"),
    created_at: str(row.created_at ?? row.createdAt ?? row.date),
    payment_date: (row.payment_date ?? row.paymentDate ?? null) as string | null,
    updated_at: str(row.updated_at ?? row.updatedAt ?? row.created_at ?? row.date),
  }));

  const earningsRaw = Array.isArray(body.recent_earnings)
    ? body.recent_earnings
    : Array.isArray(body.recentEarnings)
      ? body.recentEarnings
      : [];
  const recentEarnings = earningsRaw.filter(isPlainObject).map((row) => ({
    id: str(row.id),
    amount: num(row.amount),
    created_at: str(row.created_at ?? row.createdAt ?? row.date),
    note: (row.note ?? null) as string | null,
    appointment_id: (row.appointment_id ?? row.appointmentId ?? null) as
      | string
      | null,
    appointment_date: null as string | null,
    time_slot: null as string | null,
    service_name: (row.appointment ?? row.service_name ?? null) as string | null,
    patient_id: (row.patient_id ?? row.patientId ?? null) as string | null,
    patient_name: (row.parent ??
      row.patient_name ??
      row.patientName ??
      null) as string | null,
  }));

  const currency = str(
    wallet?.currency ?? method?.currency ?? rawRequest.currency ?? "ETB",
  );

  return {
    request,
    context: {
      wallet: wallet
        ? {
            available_balance: num(
              wallet.available_balance ?? wallet.availableBalance,
            ),
            pending_balance: num(
              wallet.pending_balance ?? wallet.pendingBalance,
            ),
            currency,
          }
        : null,
      commissionPercent: num(
        thisMonth?.platform_commission ?? thisMonth?.platformCommission ?? 10,
      ),
      thisMonth: {
        earned: num(thisMonth?.net_earnings ?? thisMonth?.netEarnings),
        paidOut: num(thisMonth?.paid_out ?? thisMonth?.paidOut),
        requested: num(thisMonth?.open_requests ?? thisMonth?.openRequests),
        payoutCount: num(
          thisMonth?.payout_requests ?? thisMonth?.payoutRequests,
        ),
      },
      thisWeek: {
        earned: num(wallet?.earned_this_week ?? wallet?.earnedThisWeek),
        payoutCount: 0,
      },
      payoutHistory,
      recentEarnings,
    },
  };
}

function mapPatientPayoutMethod(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    id: row.id != null ? str(row.id) : undefined,
    holder_name: str(row.holder_name ?? row.holderName),
    account_number: str(row.account_number ?? row.accountNumber),
    bank_name: str(row.bank_name ?? row.bankName),
    bank_code: (row.bank_code ?? row.bankCode ?? null) as string | null,
    currency: str(row.currency || "ETB"),
  };
}

function mapPatientWithdrawalRow(
  row: Record<string, unknown>,
  extras: {
    patient?: Record<string, unknown> | null;
    payout_method?: Record<string, unknown> | null;
  } = {},
) {
  const patientRaw =
    extras.patient ??
    (isPlainObject(row.patient) ? row.patient : null);
  const methodRaw =
    extras.payout_method ??
    (isPlainObject(row.payout_method)
      ? row.payout_method
      : isPlainObject(row.payoutMethod)
        ? row.payoutMethod
        : null);

  return {
    id: str(row.id),
    patient_id: str(row.patient_id ?? row.patientId ?? patientRaw?.id),
    amount: num(row.amount),
    status: str(row.status || "pending"),
    note: (row.note ?? null) as string | null,
    admin_note: (row.admin_note ?? row.adminNote ?? null) as string | null,
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: (row.updated_at ?? row.updatedAt ?? null) as string | null,
    chapa_transfer_reference: (row.chapa_transfer_reference ??
      row.chapaTransferReference ??
      null) as string | null,
    patient: patientRaw
      ? {
          id: str(patientRaw.id),
          full_name: (patientRaw.full_name ??
            patientRaw.fullName ??
            patientRaw.name ??
            null) as string | null,
          phone: (patientRaw.phone ?? null) as string | null,
        }
      : null,
    payout_method: mapPatientPayoutMethod(methodRaw),
  };
}

/** OpenAPI patient withdrawal review → { request, wallet }. */
function mapPatientWithdrawalReviewOut(body: Record<string, unknown>) {
  const rawRequest = isPlainObject(body.request) ? body.request : body;
  const patient = isPlainObject(body.patient) ? body.patient : null;
  const wallet = isPlainObject(body.wallet) ? body.wallet : null;
  const method = isPlainObject(body.payout_method)
    ? body.payout_method
    : isPlainObject(body.payoutMethod)
      ? body.payoutMethod
      : isPlainObject(rawRequest.payout_method)
        ? rawRequest.payout_method
        : isPlainObject(rawRequest.payoutMethod)
          ? rawRequest.payoutMethod
          : null;

  const request = mapPatientWithdrawalRow(rawRequest, {
    patient,
    payout_method: method,
  });

  return {
    request,
    wallet: wallet
      ? {
          balance: num(wallet.balance),
          currency: str(wallet.currency || "ETB"),
        }
      : null,
  };
}

function documentListRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (isPlainObject(body) && Array.isArray(body.documents)) {
    return body.documents.filter(isPlainObject);
  }
  return [];
}

function mapWalletTransactionRow(row: Record<string, unknown>) {
  const profilesRaw = isPlainObject(row.doctor_profiles)
    ? row.doctor_profiles
    : isPlainObject(row.doctorProfiles)
      ? row.doctorProfiles
      : null;
  return {
    ...row,
    id: str(row.id),
    doctor_id: str(row.doctor_id ?? row.doctorId),
    amount: num(row.amount),
    is_credit: Boolean(row.is_credit ?? row.isCredit),
    type: str(row.type),
    appointment_id: (row.appointment_id ??
      row.appointmentId ??
      null) as string | null,
    payout_request_id: (row.payout_request_id ??
      row.payoutRequestId ??
      null) as string | null,
    note: (row.note ?? null) as string | null,
    created_at: str(row.created_at ?? row.createdAt),
    doctor_profiles: profilesRaw
      ? {
          first_name: str(profilesRaw.first_name ?? profilesRaw.firstName),
          last_name: str(profilesRaw.last_name ?? profilesRaw.lastName),
        }
      : null,
  };
}

function walletTransactionRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (isPlainObject(body) && Array.isArray(body.transactions)) {
    return body.transactions.filter(isPlainObject);
  }
  return [];
}

function mapUserReferral(row: Record<string, unknown>) {
  return {
    referralCodeUsed: (row.referral_code_used ??
      row.referralCodeUsed ??
      null) as string | null,
    referredByDoctorId: (row.referred_by_doctor_id ??
      row.referredByDoctorId ??
      null) as string | null,
    referredByDoctorName: (row.referred_by_doctor_name ??
      row.referredByDoctorName ??
      null) as string | null,
    referredAt: (row.referred_at ?? row.referredAt ?? null) as string | null,
    canApplyCode: Boolean(row.can_apply_code ?? row.canApplyCode),
  };
}

function mapDoctorWalletHistory(
  body: unknown,
  searchParams?: URLSearchParams,
) {
  if (isPlainObject(body) && isPlainObject(body.history)) {
    const history = body.history;
    const txCount = Array.isArray(history.transactions)
      ? history.transactions.length
      : 0;
    return {
      history,
      pagination: listPageMeta(body, searchParams, txCount),
    };
  }

  const walletRaw =
    isPlainObject(body) && isPlainObject(body.wallet) ? body.wallet : null;
  const transactions = walletTransactionRows(body).map(mapWalletTransactionRow);
  const earnings = transactions
    .filter((row) => row.type === "appointment_earning")
    .map((row) => ({
      id: row.id,
      amount: row.amount,
      created_at: row.created_at,
      note: row.note,
      appointment_id: row.appointment_id,
      appointment_date: null,
      time_slot: null,
      service_name: null,
      patient_id: null,
      patient_name: null,
    }));

  return {
    history: {
      wallet: walletRaw
        ? {
            available_balance: num(
              walletRaw.available_balance ?? walletRaw.availableBalance,
            ),
            pending_balance: num(
              walletRaw.pending_balance ?? walletRaw.pendingBalance,
            ),
            currency: str(walletRaw.currency || "ETB"),
          }
        : null,
      // ponytail: wallet bundle has no commission; UI only displays the number
      commissionPercent: num(
        isPlainObject(body)
          ? (body.commissionPercent ?? body.commission_percent ?? 30)
          : 30,
      ),
      earnings,
      transactions,
    },
    pagination: listPageMeta(body, searchParams, transactions.length),
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
    const app =
      body.app === "doctors" || body.app === "mc"
        ? body.app
        : options.searchParams?.get("app") === "doctors"
          ? "doctors"
          : "mc";
    return {
      app,
      appVersionSettings: settingsData(body, "appVersionSettings"),
      updatedAt: settingsUpdatedAt(body),
    };
  }

  if (head === "wallet-transactions" && (Array.isArray(body) || isPlainObject(body))) {
    const transactions = walletTransactionRows(body).map(mapWalletTransactionRow);
    return {
      transactions,
      pagination: listPageMeta(body, options.searchParams, transactions.length),
    };
  }

  if (head === "documents" && rest.length === 0 && upper === "GET") {
    return { documents: documentListRows(body).map(mapDocumentRow) };
  }

  if (head === "users" && rest.length === 2 && rest[1] === "referral") {
    const raw = isPlainObject(body)
      ? isPlainObject(body.referral)
        ? body.referral
        : body
      : null;
    if (!raw) return body;
    return {
      referral: mapUserReferral(raw),
      ...(isPlainObject(body) && body.applied != null && upper === "POST"
        ? { applied: body.applied }
        : {}),
    };
  }

  if (head === "doctors" && rest.length === 2 && rest[1] === "wallet" && upper === "GET") {
    return mapDoctorWalletHistory(body, options.searchParams);
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
    // ponytail: API has no event_type/actor_type; filter after page — skews totals when set
    if (eventType) logs = logs.filter((row) => row.event_type === eventType);
    if (actorType) logs = logs.filter((row) => row.actor_type === actorType);
    return {
      logs,
      pagination: listPageMeta(body, options.searchParams, logs.length),
    };
  }

  if (head === "children" && rest.length === 0 && upper === "GET") {
    const children = childListRows(body).map(mapChildRow);
    return {
      children,
      items: children,
      pagination: listPageMeta(body, options.searchParams, children.length),
    };
  }

  if (head === "appointments" && rest.length === 1 && rest[0] !== "stats" && upper === "GET") {
    if (isPlainObject(body) && "appointment" in body) {
      const raw = isPlainObject(body.appointment) ? body.appointment : null;
      return {
        appointment: raw ? mapAppointmentRow(raw) : body.appointment,
        conversation: body.conversation ?? null,
        messages: Array.isArray(body.messages) ? body.messages : [],
      };
    }
    if (!Array.isArray(body)) {
      return isPlainObject(body)
        ? {
            appointment: mapAppointmentRow(body),
            conversation: null,
            messages: [],
          }
        : body;
    }
    const appointment = findById(body, rest[0]);
    if (!appointment) return { error: "Appointment not found", stagingNotFound: true };
    return {
      appointment: mapAppointmentRow(appointment),
      conversation: null,
      messages: [],
    };
  }

  if (head === "appointments" && rest.length === 1 && upper === "PATCH") {
    return isPlainObject(body)
      ? { appointment: mapAppointmentRow(body) }
      : body;
  }

  if (head === "admins" && upper === "PATCH") {
    return isPlainObject(body) ? { admin: body } : body;
  }

  if (head === "documents" && upper === "POST" && rest.length === 0) {
    if (!isPlainObject(body)) return body;
    const row = isPlainObject(body.document) ? body.document : body;
    return { document: mapDocumentRow(row) };
  }

  if (head === "payout-requests" && rest.length === 1 && upper === "GET") {
    if (isPlainObject(body) && ("request" in body || "wallet" in body || "doctor" in body)) {
      return mapPayoutReviewOut(body);
    }
    if (Array.isArray(body)) {
      const request = findById(body, rest[0]);
      if (!request) {
        return { error: "Payout request not found", stagingNotFound: true };
      }
      return { request, context: null };
    }
    return isPlainObject(body) ? mapPayoutReviewOut({ request: body }) : body;
  }

  if (head === "patient-withdrawals" && rest.length === 1 && upper === "GET") {
    if (
      isPlainObject(body) &&
      ("request" in body || "wallet" in body || "patient" in body)
    ) {
      return mapPatientWithdrawalReviewOut(body);
    }
    if (Array.isArray(body)) {
      const row = findById(body, rest[0]);
      if (!row) {
        return { error: "Withdrawal request not found", stagingNotFound: true };
      }
      return { request: mapPatientWithdrawalRow(row), wallet: null };
    }
    return isPlainObject(body)
      ? mapPatientWithdrawalReviewOut({ request: body })
      : body;
  }

  if (head === "children" && rest.length === 2 && upper === "GET") {
    if (rest[1] === "measurements") {
      return {
        measurements: childDetailRows(body, ["measurements", "items", "data"]).map(
          mapChildMeasurementRow,
        ),
      };
    }
    if (rest[1] === "milestones") {
      return {
        milestoneChecks: childDetailRows(body, [
          "milestones",
          "milestoneChecks",
          "items",
          "data",
        ]).map(mapChildMilestoneRow),
      };
    }
    if (rest[1] === "vaccines") {
      return {
        vaccineRecords: childDetailRows(body, [
          "vaccines",
          "vaccineRecords",
          "items",
          "data",
        ]).map(mapChildVaccineRow),
      };
    }
  }

  if (head === "children" && rest.length === 1 && upper === "GET") {
    // Bare child row or envelope; nested lists come from sibling endpoints.
    if (isPlainObject(body) && isPlainObject(body.child)) {
      return {
        child: mapChildRow(body.child),
        milestoneChecks: childDetailRows(body, [
          "milestoneChecks",
          "milestones",
        ]).map(mapChildMilestoneRow),
        measurements: childDetailRows(body, ["measurements"]).map(
          mapChildMeasurementRow,
        ),
        vaccineRecords: childDetailRows(body, [
          "vaccineRecords",
          "vaccines",
        ]).map(mapChildVaccineRow),
        vaccineSchedule: Array.isArray(body.vaccineSchedule)
          ? body.vaccineSchedule
          : [],
        growthPeriods: Array.isArray(body.growthPeriods)
          ? body.growthPeriods.filter(isPlainObject).map(mapChildGrowthPeriodRow)
          : [],
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
      case "appointments": {
        if (rest[0] === "stats") {
          return deriveAppointmentStats(body);
        }
        const appointments = appointmentListRows(body)
          .map(mapAppointmentRow)
          .sort(byAppointmentDateDesc);
        return {
          appointments,
          pagination: listPageMeta(body, options.searchParams, appointments.length),
        };
      }
      case "hospitals": {
        const hospitals = body
          .filter(isPlainObject)
          .map((row) => ({
            ...row,
            image_url: resolveBackendMediaUrl(
              (row.image_url ?? row.imageUrl ?? null) as string | null,
            ),
          }))
          .sort(bySortOrderThenName);
        return upper === "POST"
          ? { hospital: hospitals[0] ?? body }
          : { hospitals };
      }
      case "doctor-categories":
        return {
          categories: body
            .filter(isPlainObject)
            .map((row) => ({
              ...row,
              image_url: resolveBackendMediaUrl(
                (row.image_url ?? row.imageUrl ?? null) as string | null,
              ),
            }))
            .sort(bySortOrderThenName),
        };
      case "users":
        if (rest.length === 1) return { profile: body[0] ?? body };
        return {
          profiles: body,
          pagination: listPageMeta(
            { profiles: body },
            options.searchParams,
            body.length,
          ),
        };
      case "documents":
        return { documents: body.filter(isPlainObject).map(mapDocumentRow) };
      case "payout-requests":
        return {
          requests: body.filter(isPlainObject).map((row) => {
            const method = isPlainObject(row.payout_method)
              ? row.payout_method
              : isPlainObject(row.doctor_payout_methods)
                ? row.doctor_payout_methods
                : null;
            const doctor = isPlainObject(row.doctor)
              ? row.doctor
              : isPlainObject(row.doctor_profiles)
                ? row.doctor_profiles
                : null;
            const doctorId = str(row.doctor_id ?? row.doctorId ?? doctor?.id);
            const profiles = doctor
              ? doctor.first_name != null || doctor.firstName != null
                ? {
                    first_name: str(doctor.first_name ?? doctor.firstName),
                    last_name: str(doctor.last_name ?? doctor.lastName),
                    phone: (doctor.phone ?? null) as string | null,
                  }
                : (() => {
                    const names = splitDoctorDisplayName(str(doctor.name ?? ""));
                    return {
                      first_name: names.first_name,
                      last_name: names.last_name,
                      phone: (doctor.phone ?? null) as string | null,
                    };
                  })()
              : null;
            const mappedMethod = mapPayoutMethodReview(method, doctorId);
            return {
              ...row,
              id: str(row.id),
              doctor_id: doctorId,
              payout_method_id:
                str(row.payout_method_id ?? row.payoutMethodId) ||
                mappedMethod?.id ||
                null,
              amount: num(row.amount),
              status: str(row.status || "pending"),
              note: (row.doctor_note ??
                row.doctorNote ??
                row.note ??
                null) as string | null,
              admin_note: (row.admin_note ?? row.adminNote ?? null) as
                | string
                | null,
              created_at: str(row.created_at ?? row.createdAt),
              payment_date: (row.payment_date ?? row.paymentDate ?? null) as
                | string
                | null,
              updated_at: str(
                row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt,
              ),
              doctor_profiles: profiles,
              doctor_payout_methods: mappedMethod,
            };
          }),
        };
      case "payout-methods":
      case "payment-methods":
        return {
          methods: body.filter(isPlainObject).map(mapPaymentMethodRow),
        };
      case "patient-withdrawals":
        return {
          requests: body.filter(isPlainObject).map((row) =>
            mapPatientWithdrawalRow(row),
          ),
        };
      case "wallet-transactions": {
        const transactions = body
          .filter(isPlainObject)
          .map(mapWalletTransactionRow);
        return {
          transactions,
          pagination: listPageMeta(
            { transactions: body },
            options.searchParams,
            transactions.length,
          ),
        };
      }
      case "admins":
        return { admins: body };
      case "app-membership-members": {
        const members = membershipListRows(body).map(mapMembershipMember);
        return { members, subscriptions: members };
      }
      case "activity-logs": {
        const logs = body.map((row) =>
          mapActivityLog(isPlainObject(row) ? row : {}, null),
        );
        return {
          logs,
          pagination: listPageMeta(
            { logs: body },
            options.searchParams,
            logs.length,
          ),
        };
      }
      case "activity":
        return {
          logs: body.map((row) =>
            mapActivityLog(isPlainObject(row) ? row : {}, "platform"),
          ),
        };
      case "legal-documents":
        return { documents: body };
      case "pregnancy-weeks": {
        const weeks = body
          .filter(isPlainObject)
          .map(mapPregnancyWeekRow)
          .sort((a, b) => byNum(a.week_number, b.week_number));
        return { weeks, items: weeks };
      }
      case "child-growth": {
        const periods = body
          .filter(isPlainObject)
          .map(mapChildGrowthPeriodRow)
          .sort((a, b) => byNum(a.age_months, b.age_months));
        return { periods, items: periods };
      }
      case "clinical-advice": {
        const items = body
          .filter(isPlainObject)
          .map(mapClinicalAdviceRow)
          .sort((a, b) => byNum(a.sort_order, b.sort_order));
        return { items, advice: items };
      }
      case "followup-visits": {
        const templates = body
          .filter(isPlainObject)
          .slice()
          .sort((a, b) =>
            byNum(a.sort_order ?? a.sortOrder, b.sort_order ?? b.sortOrder),
          );
        return { templates, items: templates };
      }
      case "referrals": {
        const mapped = body
          .filter(isPlainObject)
          .map(mapReferralRow);
        const subscribed = options.searchParams?.get("subscribed");
        const referrals = filterByAdminParams(mapped, options.searchParams, (row) => {
          if (subscribed === "yes") return row.isSubscribed;
          if (subscribed === "no") return !row.isSubscribed;
          return true;
        });
        return {
          referrals,
          pagination: listPageMeta(body, options.searchParams, referrals.length),
        };
      }
      case "referral-commissions": {
        const mapped = body.filter(isPlainObject).map(mapCommissionRow);
        const commissions = filterByAdminParams(mapped, options.searchParams);
        return {
          commissions,
          pagination: listPageMeta(body, options.searchParams, commissions.length),
        };
      }
      case "children": {
        const children = body.filter(isPlainObject).map(mapChildRow);
        return {
          children,
          items: children,
          pagination: listPageMeta(body, options.searchParams, children.length),
        };
      }
      case "daily-tips": {
        const tips = body
          .filter(isPlainObject)
          .map(mapDailyTipRow)
          .sort((a, b) => {
            const week = byNum(a.week_number, b.week_number);
            if (week !== 0) return week;
            return byNum(a.day_number ?? 999, b.day_number ?? 999);
          });
        return { tips, items: tips };
      }
      default:
        return { items: body, data: body };
    }
  }

  if (isPlainObject(body)) {
    if (head === "appointments" && rest.length === 0) {
      const appointments = appointmentListRows(body)
        .map(mapAppointmentRow)
        .sort(byAppointmentDateDesc);
      return {
        appointments,
        pagination: listPageMeta(body, options.searchParams, appointments.length),
      };
    }
    if (head === "appointments" && rest[0] === "stats") {
      return deriveAppointmentStats(appointmentListRows(body));
    }
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
        const logsByPregnancy = groupUserDetailLogs(body);
        return {
          profile: body.profile ?? body,
          pregnancies: Array.isArray(body.pregnancies) ? body.pregnancies : [],
          children: Array.isArray(body.children) ? body.children : [],
          logsByPregnancy,
          user: body.profile ?? body,
        };
      }
      return {
        profile: body,
        user: body,
        pregnancies: [],
        children: [],
        logsByPregnancy: {},
      };
    }
    if (head === "pregnancies" && rest.length === 0) {
      const pregnancies = Array.isArray(body.pregnancies)
        ? body.pregnancies
        : Array.isArray(body.items)
          ? body.items
          : [];
      return { pregnancies };
    }
    if (
      (head === "pregnancy-logs" || head === "health-logs") &&
      rest.length === 0
    ) {
      const logs = Array.isArray(body.logs)
        ? body.logs
        : Array.isArray(body.items)
          ? body.items
          : [];
      return { logs };
    }
    if (head === "payout-requests" && rest.length === 1 && upper === "GET") {
      return mapPayoutReviewOut(body);
    }
    if (head === "payout-requests" && rest.length === 1) {
      return { request: body, ...body };
    }
    if (
      (head === "payout-methods" || head === "payment-methods") &&
      rest.length === 0 &&
      upper === "GET"
    ) {
      return {
        methods: paymentMethodListRows(body).map(mapPaymentMethodRow),
      };
    }
    if (
      (head === "payout-methods" || head === "payment-methods") &&
      rest.length === 1 &&
      upper === "GET"
    ) {
      return { method: mapPaymentMethodRow(body) };
    }
    if (head === "patient-withdrawals" && rest.length === 1 && upper === "GET") {
      return mapPatientWithdrawalReviewOut(body);
    }
    if (head === "patient-withdrawals" && rest.length === 1) {
      const request = mapPatientWithdrawalRow(
        isPlainObject(body.request) ? body.request : body,
        {
          patient: isPlainObject(body.patient) ? body.patient : null,
          payout_method: isPlainObject(body.payout_method)
            ? body.payout_method
            : isPlainObject(body.payoutMethod)
              ? body.payoutMethod
              : null,
        },
      );
      return { request };
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
        appMembershipSettings: parseAppMembershipSettingsData(
          settingsData(body, "appMembershipSettings"),
        ),
        updatedAt: settingsUpdatedAt(body),
      };
    }
    if (head === "referral-settings") {
      const data = settingsData(body, "referralSettings");
      return {
        referralSettings: {
          commissionPercent: num(
            data.commissionPercent ?? data.commission_percent ?? 20,
          ),
        },
        updatedAt: settingsUpdatedAt(body),
      };
    }
    if (head === "finance-settings") {
      return {
        financeSettings: parseFinanceSettings(
          settingsData(body, "financeSettings"),
        ),
        updatedAt: settingsUpdatedAt(body),
      };
    }
    if (head === "pregnancy-payment-settings") {
      return {
        pregnancyPaymentSettings: parseProfilePaymentSettings(
          settingsData(body, "pregnancyPaymentSettings"),
          "pregnancy_payment",
        ),
        updatedAt: settingsUpdatedAt(body),
      };
    }
    if (head === "child-payment-settings") {
      return {
        childPaymentSettings: parseProfilePaymentSettings(
          settingsData(body, "childPaymentSettings"),
          "child_payment",
        ),
        updatedAt: settingsUpdatedAt(body),
      };
    }
    if (head === "legal-documents" && (upper === "PATCH" || upper === "PUT")) {
      const doc = isPlainObject(body.document) ? body.document : body;
      return { document: doc };
    }
    if (head === "documents" && rest[1] === "deliver" && upper === "POST") {
      return { ok: true, delivery: body, ...(isPlainObject(body) ? body : {}) };
    }
    if (head === "payment-settings") {
      return {
        paymentSettings: settingsData(body, "paymentSettings"),
        updatedAt: settingsUpdatedAt(body),
      };
    }
    if (head === "app-membership-members") {
      const members = membershipListRows(body).map(mapMembershipMember);
      return { members, subscriptions: members };
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
    const status = String(row.status ?? "").trim().toLowerCase();
    if (status === "pending") counts.pending += 1;
    else if (status === "confirmed") counts.confirmed += 1;
    else if (status === "completed") counts.completed += 1;
    else if (status === "cancelled") counts.cancelled += 1;
  }
  return counts;
}
