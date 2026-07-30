import { ACTIVITY_EVENT_LABELS, ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { formatMoney } from "@/lib/appointments/display";
import type { CombinedActivityLog } from "@/lib/types/activity";

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  appointment: "Appointment",
  doctor_profile: "Doctor",
  payout_request: "Payout request",
  hospital: "Hospital",
  doctor_category: "Speciality",
  pregnancy_week: "Pregnancy week",
  child_growth_period: "Child milestone period",
  daily_tip: "Daily tip",
  content_translation: "Content item",
  admin_user: "Portal admin",
  app_settings: "App settings",
};

const SENSITIVE_METADATA_KEYS = new Set([
  "secret",
  "secretkey",
  "password",
  "token",
  "fcm_token",
  "authorization",
]);

export type ActivityDetailSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

function metadataString(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "string") return value.trim() || "N/A";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatMetadataKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isSensitiveMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
  return SENSITIVE_METADATA_KEYS.has(normalized);
}

export function activityEventCategory(eventType: string): string {
  return ACTIVITY_EVENT_LABELS[eventType] ?? eventType.replace(/_/g, " ");
}

export function activityResourceLabel(resourceType: string | null): string {
  if (!resourceType) return "N/A";
  return RESOURCE_TYPE_LABELS[resourceType] ?? formatMetadataKey(resourceType);
}

export function activityResourceHref(log: CombinedActivityLog): string | null {
  if (!log.resource_type || !log.resource_id) return null;
  const meta = log.metadata ?? {};

  switch (log.resource_type) {
    case "payout_request":
      return `/admin/finance/payout-request/${log.resource_id}`;
    case "doctor_profile":
      return `/admin/doctors/${log.resource_id}`;
    case "appointment":
      return `/admin/appointments`;
    case "hospital":
      return `/admin/hospitals`;
    case "doctor_category":
      return `/admin/doctor-categories`;
    case "pregnancy_week": {
      const weekNumber = meta.week_number;
      if (typeof weekNumber === "number") {
        return `/admin/pregnancy-weeks/${weekNumber}`;
      }
      return `/admin/pregnancy-weeks`;
    }
    case "child_growth_period": {
      const ageMonths = meta.age_months;
      if (typeof ageMonths === "number") {
        return `/admin/child-growth/${ageMonths}`;
      }
      return `/admin/child-growth`;
    }
    case "daily_tip":
      return `/admin/content/daily_tip`;
    case "content_translation": {
      const namespace = meta.namespace;
      const entityId = meta.entity_id;
      if (typeof namespace === "string" && typeof entityId === "string") {
        return `/admin/content/${namespace}/${entityId}`;
      }
      return `/admin/content`;
    }
    case "admin_user":
      return `/admin/admins`;
    default:
      return null;
  }
}

export function activitySummary(log: CombinedActivityLog): string {
  const meta = log.metadata ?? {};

  if (log.event_type === ADMIN_ACTIVITY_EVENTS.PAYOUT_ACTION) {
    const action = String(meta.action ?? "").toLowerCase();
    const amount = Number(meta.amount ?? 0);
    const doctorName = String(meta.doctor_name ?? "").trim();
    const amountText =
      amount > 0 ? formatMoney(amount, String(meta.currency ?? "ETB")) : "";
    const doctorText = doctorName ? ` for ${doctorName}` : "";

    if (action === "approve") return `Approved payout${amountText ? ` of ${amountText}` : ""}${doctorText}`;
    if (action === "reject") return `Rejected payout${amountText ? ` of ${amountText}` : ""}${doctorText}`;
    if (action === "complete") return `Marked payout as paid${amountText ? ` (${amountText})` : ""}${doctorText}`;
    if (action === "chapa_transfer" || meta.tx_ref) {
      return `Sent Chapa bank transfer${amountText ? ` of ${amountText}` : ""}${doctorText}`;
    }
    return log.event_label;
  }

  if (log.event_type === ADMIN_ACTIVITY_EVENTS.APPOINTMENT_STATUS) {
    const previous = String(meta.previous_status ?? "");
    const next = String(meta.new_status ?? "");
    const patient = String(meta.patient_name ?? "").trim();
    if (previous && next) {
      return patient
        ? `Changed appointment for ${patient}: ${previous} to ${next}`
        : `Changed appointment status: ${previous} to ${next}`;
    }
  }

  if (log.event_type === ADMIN_ACTIVITY_EVENTS.CONTENT_SAVED) {
    const title = String(meta.title ?? "").trim();
    if (title) return `Saved ${title}`;
  }

  if (log.event_type === ADMIN_ACTIVITY_EVENTS.CONTENT_DELETED) {
    const title = String(meta.title ?? "").trim();
    if (title) return `Deleted ${title}`;
  }

  return log.event_label;
}

export function activityDetailDescription(log: CombinedActivityLog): string {
  const summary = activitySummary(log);
  if (summary !== log.event_label) return summary;
  return log.event_label || activityEventCategory(log.event_type);
}

export function activityMetadataSections(log: CombinedActivityLog): ActivityDetailSection[] {
  const meta = log.metadata ?? {};
  const rows = Object.entries(meta)
    .filter(([key]) => !isSensitiveMetadataKey(key))
    .map(([key, value]) => ({
      label: formatMetadataKey(key),
      value: metadataString(value),
    }));

  if (rows.length === 0) return [];

  return [{ title: "Details", rows }];
}

export function activityTechnicalSection(log: CombinedActivityLog): ActivityDetailSection {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Event type", value: log.event_type },
    { label: "Log ID", value: log.id },
    { label: "Source", value: log.source === "admin" ? "Admin portal" : "Platform" },
  ];

  if (log.resource_type) {
    rows.push({ label: "Resource type", value: activityResourceLabel(log.resource_type) });
  }
  if (log.resource_id) {
    rows.push({ label: "Resource ID", value: log.resource_id });
  }
  if (log.ip_address) {
    rows.push({ label: "IP address", value: log.ip_address });
  }
  if (log.user_agent) {
    rows.push({ label: "User agent", value: log.user_agent });
  }

  return { title: "Technical", rows };
}
