import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DailyTip, DailyTipTranslation } from "@/lib/types/database";

const TIP_SELECT =
  "*, daily_tip_translations!pregnancy_tip_translations_tip_id_fkey(id, tip_id, language_code, title, content, created_at, updated_at)";

function normalizeDailyTip(
  row: DailyTip & { daily_tip_translations_1?: DailyTipTranslation[] },
): DailyTip {
  return {
    ...row,
    daily_tip_translations:
      row.daily_tip_translations ?? row.daily_tip_translations_1 ?? [],
  };
}

export async function GET() {
  const auth = await requireAdminViewPermission("view_content");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("daily_tips")
      .select(TIP_SELECT)
      .order("week_number", { ascending: true })
      .order("day_number", { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tips = ((data ?? []) as DailyTip[]).map((row) =>
      normalizeDailyTip(row as DailyTip & { daily_tip_translations_1?: DailyTipTranslation[] }),
    );
    return NextResponse.json({ tips });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
