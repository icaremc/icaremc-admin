export async function logAdminPortalEvent(input: {
  event_type: string;
  event_label: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/admin/activity/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // Non-blocking client logging.
  }
}
