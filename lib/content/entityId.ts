import type { ContentNamespace } from "@/lib/types/database";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function newUuidEntityId(): string {
  return crypto.randomUUID();
}

/** @deprecated Use newUuidEntityId */
export function newDailyTipEntityId(): string {
  return newUuidEntityId();
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function namespaceUsesUuidEntityId(namespace: ContentNamespace): boolean {
  return namespace === "daily_tip";
}

export function truncateEntityId(id: string, visible = 8): string {
  if (id.length <= visible + 3) return id;
  return `${id.slice(0, visible)}…`;
}
