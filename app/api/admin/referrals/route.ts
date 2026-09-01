import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import {
  listReferrals,
  type ReferralListFilters,
} from "@/lib/referrals/listReferrals";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

function parseSubscribed(value: string | null): ReferralListFilters["subscribed"] {
  if (value === "yes" || value === "no") return value;
  return "all";
}

export async function GET(request: Request) {
  const auth = await requireAdminViewPermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId")?.trim() || undefined;
  const from = searchParams.get("from")?.trim() || undefined;
  const to = searchParams.get("to")?.trim() || undefined;
  const subscribed = parseSubscribed(searchParams.get("subscribed"));

  try {
    const client = createServiceSupabaseClient();
    const referrals = await listReferrals(client, {
      doctorId,
      from,
      to,
      subscribed,
    });

    return NextResponse.json({ referrals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
