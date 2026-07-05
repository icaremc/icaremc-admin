import { logAdminPortalEvent } from "@/lib/client/logAdminActivity";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";

export function logContentSaved(
  resourceType: string,
  resourceId: string,
  label: string,
  metadata?: Record<string, unknown>,
) {
  void logAdminPortalEvent({
    event_type: ADMIN_ACTIVITY_EVENTS.CONTENT_SAVED,
    event_label: label,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: { title: label, ...metadata },
  });
}

export function logContentDeleted(
  resourceType: string,
  resourceId: string,
  label: string,
  metadata?: Record<string, unknown>,
) {
  void logAdminPortalEvent({
    event_type: ADMIN_ACTIVITY_EVENTS.CONTENT_DELETED,
    event_label: label,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: { title: label, ...metadata },
  });
}
