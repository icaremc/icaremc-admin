import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission, requireAdminViewPermission } from "@/lib/adminAuth";
import { applyPatientReferralCode } from "@/lib/referrals/applyReferralCode";
import { fetchUserReferralInfo } from "@/lib/referrals/userReferral";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminViewPermission("manage_users");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const referral = await fetchUserReferralInfo(client, id);
    return NextResponse.json({ referral });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminManagePermission("manage_users");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  let body: { code?: string } = {};
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const result = await applyPatientReferralCode(client, id, code);
    const referral = await fetchUserReferralInfo(client, id);

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.CONTENT_SAVED,
        eventLabel: `Applied referral code ${result.referralCode} to patient ${id}`,
        resourceType: "doctor_referral",
        resourceId: id,
      },
      request,
    );

    return NextResponse.json({ referral, applied: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 400 },
    );
  }
}
