/**
 * Normalize Render staging responses into the shapes existing admin UI expects.
 */

import { parseAppMembershipSettingsData } from "../appMembership/subscriptionSettings.ts";

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
    if (!Array.isArray(body)) {
      return { error: "Doctor not found", stagingNotFound: true };
    }
    const doctor = findById(body, rest[0]);
    if (!doctor) return { error: "Doctor not found", stagingNotFound: true };
    return pushReadinessFromToken(doctor.fcm_token, doctor.notifications_enabled);
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
      return {
        doctor: {
          ...body.doctor,
          doctor_services: body.doctor.doctor_services ?? services,
          doctor_availability_slots:
            body.doctor.doctor_availability_slots ?? slots,
        },
      };
    }
    if (!Array.isArray(body)) {
      return isPlainObject(body) ? { doctor: body } : body;
    }
    const doctor = findById(body, rest[0]);
    if (!doctor) return { error: "Doctor not found", stagingNotFound: true };
    return { doctor };
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
        return { doctors: body };
      case "appointments":
        if (rest[0] === "stats") {
          return deriveAppointmentStats(body);
        }
        return { appointments: body };
      case "hospitals":
        return upper === "POST" ? { hospital: body[0] ?? body } : { hospitals: body };
      case "doctor-categories":
        return { categories: body };
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
      case "pregnancy-weeks":
        return { weeks: body, items: body };
      case "child-growth":
        return { periods: body, items: body };
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
        const tips = body.filter(isPlainObject).map((row) => {
          const nested = Array.isArray(row.daily_tip_translations)
            ? row.daily_tip_translations.filter(isPlainObject)
            : [];
          const tr = isPlainObject(row.translation) ? row.translation : null;
          const translations =
            nested.length > 0
              ? nested.map((item) => ({
                  id: str(item.id),
                  tip_id: str(item.tip_id ?? item.tipId ?? row.id),
                  language_code: str(item.language_code ?? item.languageCode ?? "en"),
                  title: str(item.title),
                  content: str(item.content),
                  created_at: str(item.created_at ?? item.createdAt),
                  updated_at: str(item.updated_at ?? item.updatedAt),
                }))
              : tr
                ? [
                    {
                      id: str(tr.id),
                      tip_id: str(tr.tip_id ?? tr.tipId ?? row.id),
                      language_code: str(tr.language_code ?? tr.languageCode ?? "en"),
                      title: str(tr.title),
                      content: str(tr.content),
                      created_at: str(tr.created_at ?? tr.createdAt),
                      updated_at: str(tr.updated_at ?? tr.updatedAt),
                    },
                  ]
                : [];
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
        });
        return { tips, items: tips };
      }
      default:
        return { items: body, data: body };
    }
  }

  if (isPlainObject(body)) {
    if (head === "doctors" && (rest[1] === "verify" || rest.length === 1)) {
      return { doctor: body, ...body };
    }
    if (head === "hospitals" && (upper === "POST" || rest.length === 1)) {
      return { hospital: body };
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
