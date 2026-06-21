import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { extractChapaReference } from "@/lib/finance/chapaPayout";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorPayoutRequest } from "@/lib/types/finance";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function isToday(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function filterBySegment(
  requests: DoctorPayoutRequest[],
  segment: string,
): DoctorPayoutRequest[] {
  const normalized = segment.trim().toLowerCase();
  if (!normalized) return requests;

  return requests.filter((request) => {
    const status = request.status;
    const note = request.admin_note ?? "";
    const method = request.doctor_payout_methods;

    if (normalized === "waiting_confirmation") {
      return status === "approved" && note.includes("reference=");
    }
    if (normalized === "failed_rejected") {
      return status === "rejected";
    }
    if (normalized === "missing_payment_method") {
      return ["pending", "approved"].includes(status) && !method;
    }
    if (normalized === "completed_today") {
      return status === "completed" && isToday(request.payment_date);
    }
    return true;
  });
}

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const segment = searchParams.get("segment") ?? "";

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("doctor_payout_requests")
      .select("*, doctor_profiles(first_name, last_name, phone), doctor_payout_methods(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const requests = filterBySegment((data ?? []) as DoctorPayoutRequest[], segment);
    const header = [
      "id",
      "doctor",
      "amount",
      "status",
      "holder_name",
      "bank_name",
      "account_number",
      "chapa_reference",
      "note",
      "admin_note",
      "created_at",
      "payment_date",
    ];

    const rows = requests.map((request) => {
      const doctor = request.doctor_profiles;
      const method = request.doctor_payout_methods;
      return [
        request.id,
        doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : request.doctor_id,
        String(request.amount),
        request.status,
        method?.holder_name ?? "",
        method?.bank_name ?? "",
        method?.account_number ?? "",
        extractChapaReference(request.admin_note),
        request.note ?? "",
        request.admin_note ?? "",
        request.created_at,
        request.payment_date ?? "",
      ]
        .map((value) => escapeCsv(String(value)))
        .join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const filename = segment
      ? `payout-audit-${segment}.csv`
      : "payout-audit.csv";

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
