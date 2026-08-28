import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import {
  chunkValues,
  latestSubscriptionPerPatient,
  matchesMembershipStatusFilter,
  subscriptionHasAccess,
  type AppSubscriptionMember,
} from "@/lib/appMembership/members";
import { signedAppMembershipReceiptUrl } from "@/lib/appMembership/receiptStorage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";

type SubscriptionRow = {
  id: string;
  patient_id: string;
  plan: string;
  status: string;
  starts_at: string;
  ends_at: string;
  amount_paid: number;
  currency: string;
  payment_method: string | null;
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

const PAGE_SIZE = 1000;

async function fetchAllSubscriptionRows(
  client: SupabaseClient,
): Promise<SubscriptionRow[]> {
  const rows: SubscriptionRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from("app_subscriptions")
      .select(
        "id, patient_id, plan, status, starts_at, ends_at, amount_paid, currency, payment_method, chapa_tx_ref, admin_receipt_url, created_at, updated_at",
      )
      .order("ends_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = (data as SubscriptionRow[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchProfilesByIds(
  client: SupabaseClient,
  patientIds: string[],
): Promise<Map<string, ProfileRow>> {
  const profileMap = new Map<string, ProfileRow>();
  if (patientIds.length === 0) return profileMap;

  for (const ids of chunkValues(patientIds, 200)) {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", ids);

    if (error) throw new Error(error.message);

    for (const profile of (data as ProfileRow[] | null) ?? []) {
      profileMap.set(profile.id, profile);
    }
  }

  return profileMap;
}

export async function GET(request: Request) {
  const auth = await requireAdminViewPermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() ?? "all";
  const expiringDays = Number.parseInt(url.searchParams.get("expiringDays") ?? "", 10);
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const showHistory = url.searchParams.get("history") === "1";

  try {
    const client = createServiceSupabaseClient();
    const rows = await fetchAllSubscriptionRows(client);
    const scopedRows = showHistory ? rows : latestSubscriptionPerPatient(rows);
    const patientIds = [...new Set(scopedRows.map((row) => row.patient_id))];
    const profileMap = await fetchProfilesByIds(client, patientIds);

    const now = Date.now();
    const expiringCutoff =
      Number.isFinite(expiringDays) && expiringDays > 0
        ? now + expiringDays * 24 * 60 * 60 * 1000
        : null;

    const members: AppSubscriptionMember[] = await Promise.all(
      scopedRows.map(async (row) => {
        const profile = profileMap.get(row.patient_id);
        const has_access = subscriptionHasAccess(row.status, row.ends_at, now);

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
          has_access,
        };
      }),
    );

    const filteredMembers = members.filter((row) => {
      if (!matchesMembershipStatusFilter(row, status)) return false;

      if (expiringCutoff !== null) {
        const endsAt = new Date(row.ends_at).getTime();
        if (!row.has_access || endsAt > expiringCutoff) return false;
      }

      if (!search) return true;
      return [row.patient_name, row.patient_phone, row.chapa_tx_ref, row.patient_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

    return NextResponse.json({
      members: filteredMembers,
      total: filteredMembers.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
