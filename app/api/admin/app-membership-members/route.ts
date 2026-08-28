import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import {
  latestSubscriptionPerPatient,
  subscriptionHasAccess,
  type AppSubscriptionMember,
} from "@/lib/appMembership/members";
import { signedAppMembershipReceiptUrl } from "@/lib/appMembership/receiptStorage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

type SubscriptionRow = {
  id: string;
  patient_id: string;
  plan: string;
  status: string;
  starts_at: string;
  ends_at: string;
  amount_paid: number;
  currency: string;
  payment_method: string;
  chapa_tx_ref: string | null;
  admin_receipt_url: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

export async function GET(request: Request) {
  const auth = await requireAdminViewPermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();
  const expiringDays = Number.parseInt(url.searchParams.get("expiringDays") ?? "", 10);
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const showHistory = url.searchParams.get("history") === "1";

  try {
    const client = createServiceSupabaseClient();
    let query = client
      .from("app_subscriptions")
      .select(
        "id, patient_id, plan, status, starts_at, ends_at, amount_paid, currency, payment_method, chapa_tx_ref, admin_receipt_url, created_at, updated_at",
      )
      .order("ends_at", { ascending: false })
      .limit(500);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data as SubscriptionRow[] | null) ?? [];
    const patientIds = [...new Set(rows.map((row) => row.patient_id))];
    const profileMap = new Map<string, ProfileRow>();

    if (patientIds.length > 0) {
      const { data: profiles, error: profileError } = await client
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", patientIds);

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      for (const profile of (profiles as ProfileRow[] | null) ?? []) {
        profileMap.set(profile.id, profile);
      }
    }

    const now = Date.now();
    const expiringCutoff =
      Number.isFinite(expiringDays) && expiringDays > 0
        ? now + expiringDays * 24 * 60 * 60 * 1000
        : null;

    const members: AppSubscriptionMember[] = await Promise.all(
      (showHistory ? rows : latestSubscriptionPerPatient(rows)).map(async (row) => {
        const profile = profileMap.get(row.patient_id);
        return {
          id: row.id,
          patient_id: row.patient_id,
          plan: row.plan,
          status: row.status as AppSubscriptionMember["status"],
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          amount_paid: Number(row.amount_paid ?? 0),
          currency: row.currency,
          payment_method: row.payment_method,
          chapa_tx_ref: row.chapa_tx_ref,
          admin_receipt_url: await signedAppMembershipReceiptUrl(
            client,
            row.admin_receipt_url,
          ),
          created_at: row.created_at,
          updated_at: row.updated_at,
          patient_name: profile?.full_name ?? null,
          patient_phone: profile?.phone ?? null,
          has_access: subscriptionHasAccess(row.status, row.ends_at, now),
        };
      }),
    );

    const filteredMembers = members.filter((row) => {
        if (expiringCutoff !== null) {
          const endsAt = new Date(row.ends_at).getTime();
          if (row.status !== "active" || endsAt <= now || endsAt > expiringCutoff) {
            return false;
          }
        }

        if (!search) return true;
        return [row.patient_name, row.patient_phone, row.chapa_tx_ref, row.patient_id]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });

    return NextResponse.json({ members: filteredMembers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
