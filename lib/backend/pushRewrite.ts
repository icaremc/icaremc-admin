/** POST /api/v1/push/notify requires user_id in the body. */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function rewritePushNotifyBody(
  userId: string,
  parsed: unknown,
): Record<string, unknown> {
  const row = isPlainObject(parsed) ? parsed : {};
  const type =
    typeof row.type === "string" && row.type.trim()
      ? row.type.trim()
      : "chat";
  const route =
    typeof row.route === "string" && row.route.trim()
      ? row.route.trim()
      : undefined;
  return {
    user_id: userId,
    title: typeof row.title === "string" ? row.title : "",
    body: typeof row.body === "string" ? row.body : "",
    type,
    data: {
      type,
      ...(route ? { route } : {}),
    },
  };
}

export function rewriteUserNotifyBody(parsed: unknown): Record<string, unknown> {
  const row = isPlainObject(parsed) ? parsed : {};
  return {
    title: typeof row.title === "string" ? row.title : "",
    body: typeof row.body === "string" ? row.body : "",
    ...(typeof row.route === "string" && row.route.trim()
      ? { route: row.route.trim() }
      : {}),
  };
}

/** doctors/:id/push | users/:id/push */
export function parsePushAdminPath(adminPath: string): {
  kind: "doctor" | "user";
  id: string;
} | null {
  const segments = adminPath.replace(/^\/+/, "").split("/").filter(Boolean);
  if (segments.length !== 3 || segments[2] !== "push") return null;
  if (segments[0] === "doctors") return { kind: "doctor", id: segments[1]! };
  if (segments[0] === "users") return { kind: "user", id: segments[1]! };
  return null;
}
