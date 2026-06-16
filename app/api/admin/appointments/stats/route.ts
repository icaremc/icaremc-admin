import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { AppointmentStatus } from "@/lib/types/doctors";

const STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const counts = await Promise.all(
      STATUSES.map(async (status) => {
        const { count, error } = await client
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("status", status);
        if (error) throw error;
        return { status, count: count ?? 0 };
      }),
    );

    const byStatus = Object.fromEntries(
      counts.map(({ status, count }) => [status, count]),
    ) as Record<AppointmentStatus, number>;

    const total = counts.reduce((sum, item) => sum + item.count, 0);

    return NextResponse.json({
      total,
      pending: byStatus.pending,
      confirmed: byStatus.confirmed,
      completed: byStatus.completed,
      cancelled: byStatus.cancelled,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
