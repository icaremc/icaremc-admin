/**
 * Normalize Render staging responses into the shapes existing admin UI expects.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function adaptBackendResponse(
  adminPath: string,
  method: string,
  status: number,
  body: unknown,
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
    if (head === "doctors" && rest[1] === "verify") {
      return { doctor: body, ...body };
    }
    if (head === "hospitals" && rest.length === 1) {
      return { hospital: body };
    }
    if (head === "users" && rest.length === 1) {
      return { profile: body, user: body };
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
