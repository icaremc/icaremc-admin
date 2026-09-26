/**
 * Normalize Render staging responses into the shapes existing admin UI expects.
 */

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

  if (head === "doctors" && rest.length === 1 && upper === "GET") {
    if (!Array.isArray(body)) {
      return isPlainObject(body) ? { doctor: body } : body;
    }
    const doctor = findById(body, rest[0]);
    if (!doctor) return { error: "Doctor not found", stagingNotFound: true };
    return { doctor };
  }

  if (head === "appointments" && rest.length === 1 && rest[0] !== "stats" && upper === "GET") {
    if (!Array.isArray(body)) {
      return isPlainObject(body)
        ? { appointment: body, conversation: null, messages: [] }
        : body;
    }
    const appointment = findById(body, rest[0]);
    if (!appointment) return { error: "Appointment not found", stagingNotFound: true };
    return { appointment, conversation: null, messages: [] };
  }

  if (head === "payout-requests" && rest.length === 1 && upper === "GET") {
    if (!Array.isArray(body)) {
      return isPlainObject(body) ? { request: body, context: null } : body;
    }
    const request = findById(body, rest[0]);
    if (!request) return { error: "Payout request not found", stagingNotFound: true };
    return { request, context: null };
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
      default:
        return { items: body, data: body };
    }
  }

  if (isPlainObject(body)) {
    if (head === "doctors" && (rest[1] === "verify" || rest.length === 1)) {
      return { doctor: body, ...body };
    }
    if (head === "hospitals" && rest.length === 1) {
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
    if (head === "doctor-categories" && upper === "POST") {
      return { category: body };
    }
    if (head === "finance-settings" || head === "app-membership-settings") {
      return { financeSettings: body.data ?? body, ...body };
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
