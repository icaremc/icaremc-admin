import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  approvePayoutRequest,
  completePayoutRequest,
  rejectPayoutRequest,
} from "@/lib/finance/payoutActions";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorPayoutRequest } from "@/lib/types/finance";

type RouteContext = { params: Promise<{ id: string }> };

const PAYOUT_SELECT =
  "*, doctor_profiles(first_name, last_name, phone), doctor_payout_methods(*)";

function isAction(value: unknown): value is "approve" | "reject" | "complete" {
  return value === "approve" || value === "reject" || value === "complete";
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("doctor_payout_requests")
      .select(PAYOUT_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    const request = data as DoctorPayoutRequest;
    const { buildDoctorPayoutContext } = await import("@/lib/finance/doctorPayoutContext");
    const doctorContext = await buildDoctorPayoutContext(request.doctor_id);

    return NextResponse.json({ request, context: doctorContext });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  let body: { action?: unknown; adminNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isAction(body.action)) {
    return NextResponse.json(
      { error: "action must be approve, reject, or complete" },
      { status: 400 },
    );
  }

  try {
    if (body.action === "approve") {
      await approvePayoutRequest(id, body.adminNote);
    } else if (body.action === "reject") {
      await rejectPayoutRequest(id, body.adminNote);
    } else {
      await completePayoutRequest(id, body.adminNote);
    }

    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("doctor_payout_requests")
      .select(PAYOUT_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data as DoctorPayoutRequest });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
