import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission, requireAdminViewPermission } from "@/lib/adminAuth";
import { sendDoctorPush } from "@/lib/push/sendDoctorPush";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type DeliveryRow = {
  id: string;
  document_id: string;
  recipient_type: string;
  recipient_id: string;
  sent_by: string | null;
  sent_at: string;
  acknowledged_at: string | null;
  admin_documents:
    | { title: string; category: string; file_name: string }
    | { title: string; category: string; file_name: string }[]
    | null;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminViewPermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: doctorId } = await context.params;
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor id is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("document_deliveries")
      .select(
        "id, document_id, recipient_type, recipient_id, sent_by, sent_at, acknowledged_at, admin_documents(title, category, file_name)",
      )
      .eq("recipient_type", "doctor")
      .eq("recipient_id", doctorId)
      .order("sent_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deliveries = ((data as DeliveryRow[] | null) ?? []).map((row) => {
      const doc = Array.isArray(row.admin_documents)
        ? row.admin_documents[0]
        : row.admin_documents;
      return {
        id: row.id,
        document_id: row.document_id,
        recipient_type: row.recipient_type,
        recipient_id: row.recipient_id,
        sent_by: row.sent_by,
        sent_at: row.sent_at,
        acknowledged_at: row.acknowledged_at,
        document_title: doc?.title ?? null,
        document_category: doc?.category ?? null,
        file_name: doc?.file_name ?? null,
      };
    });

    return NextResponse.json({ deliveries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminManagePermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: doctorId } = await context.params;
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor id is required" }, { status: 400 });
  }

  let body: { documentId?: string; note?: string } = {};
  try {
    body = (await request.json()) as { documentId?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const documentId = body.documentId?.trim();
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();

    const { data: doctor, error: doctorError } = await client
      .from("doctor_profiles")
      .select("id, first_name")
      .eq("id", doctorId)
      .maybeSingle();

    if (doctorError) throw new Error(doctorError.message);
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const { data: document, error: documentError } = await client
      .from("admin_documents")
      .select("id, title")
      .eq("id", documentId)
      .maybeSingle();

    if (documentError) throw new Error(documentError.message);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data: delivery, error: deliveryError } = await client
      .from("document_deliveries")
      .insert({
        document_id: documentId,
        recipient_type: "doctor",
        recipient_id: doctorId,
        sent_by: auth.user.id,
      })
      .select("id, document_id, recipient_type, recipient_id, sent_by, sent_at, acknowledged_at")
      .single();

    if (deliveryError) throw new Error(deliveryError.message);

    const doctorName =
      typeof doctor.first_name === "string" && doctor.first_name.trim()
        ? doctor.first_name.trim()
        : "Doctor";
    const note = body.note?.trim();

    const pushResult = await sendDoctorPush({
      serviceClient: client,
      userId: doctorId,
      input: {
        title: "New document to review",
        body:
          note ||
          `Dear ${doctorName}, please review and acknowledge "${document.title}" in the ICare Doctors app.`,
        route: "/document-delivery",
        type: "document",
        delivery_id: delivery.id,
        document_id: document.id,
      },
    });

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.PUSH_SENT,
        eventLabel: `Sent document "${document.title}" to doctor ${doctorId}`,
        resourceType: "document_delivery",
        resourceId: delivery.id,
      },
      request,
    );

    return NextResponse.json({
      delivery,
      push: pushResult,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 400 },
    );
  }
}
