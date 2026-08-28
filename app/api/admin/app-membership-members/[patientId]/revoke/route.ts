import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission } from "@/lib/adminAuth";
import { revokeAppSubscription } from "@/lib/appMembership/adminActions";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ patientId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminManagePermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { patientId } = await context.params;
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const subscription = await revokeAppSubscription(client, patientId);

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.SETTINGS_UPDATED,
        eventLabel: `Revoked app membership for patient ${patientId}`,
        resourceType: "app_subscription",
        resourceId: patientId,
      },
      request,
    );

    return NextResponse.json({ subscription });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 400 },
    );
  }
}
