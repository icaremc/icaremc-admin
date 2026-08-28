import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission } from "@/lib/adminAuth";
import { grantAppSubscription } from "@/lib/appMembership/adminActions";
import { uploadAppMembershipReceipt } from "@/lib/appMembership/receiptStorage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ patientId: string }>;
}

function readNumberField(formData: FormData, key: string): number | null {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const receipt = formData.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0) {
    return NextResponse.json({ error: "Receipt file is required" }, { status: 400 });
  }

  const durationDaysRaw = readNumberField(formData, "durationDays");
  const durationDays =
    durationDaysRaw !== null && durationDaysRaw > 0 ? Math.round(durationDaysRaw) : null;
  const amountPaid = readNumberField(formData, "amountPaid");

  try {
    const client = createServiceSupabaseClient();
    const receiptUrl = await uploadAppMembershipReceipt(client, patientId, receipt);
    const subscription = await grantAppSubscription(client, patientId, {
      durationDays,
      amountPaid,
      receiptUrl,
    });

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.SETTINGS_UPDATED,
        eventLabel: `Granted app membership to patient ${patientId}`,
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
