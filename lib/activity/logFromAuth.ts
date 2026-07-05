import { logAdminActivity, type LogAdminActivityInput } from "@/lib/activityLog";

type AdminAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type AdminAuth = {
  user: AdminAuthUser;
  adminRole: string;
};

export async function logAdminActivityFromAuth(
  auth: AdminAuth,
  input: Omit<
    LogAdminActivityInput,
    "actorId" | "actorEmail" | "actorName" | "actorRole"
  >,
  request?: Request,
): Promise<void> {
  await logAdminActivity(
    {
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? null,
      actorName:
        (auth.user.user_metadata?.full_name as string | undefined) ?? null,
      actorRole: auth.adminRole,
      ...input,
    },
    request,
  );
}
