import { NextResponse } from "next/server";
import {
  requireAdminManagePermission,
  requireAdminViewPermission,
} from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type {
  Child,
  ChildGrowthMeasurement,
  ChildGrowthPeriod,
  ChildMilestoneCheck,
  ChildUpdatePayload,
  ChildVaccineRecord,
  VaccineDoseSchedule,
} from "@/lib/types/database";

const CHILD_SELECT =
  "*, profiles(id, full_name, phone, account_type, locale, onboarding_complete, notifications_enabled, created_at)";

const PERIOD_SELECT =
  "*, child_growth_period_translations(id, period_id, language_code, title, subtitle, milestones)";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminViewPermission("view_users");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Child id is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const childRes = await client
      .from("children")
      .select(CHILD_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (childRes.error) {
      return NextResponse.json({ error: childRes.error.message }, { status: 500 });
    }
    if (!childRes.data) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const child = childRes.data as Child;

    const [periodsRes, scheduleRes] = await Promise.all([
      client
        .from("child_growth_periods")
        .select(PERIOD_SELECT)
        .eq("is_published", true)
        .order("age_months", { ascending: true }),
      client
        .from("vaccine_dose_schedule")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (periodsRes.error) {
      return NextResponse.json({ error: periodsRes.error.message }, { status: 500 });
    }
    if (scheduleRes.error) {
      return NextResponse.json({ error: scheduleRes.error.message }, { status: 500 });
    }

    const growthPeriods = (periodsRes.data ?? []) as ChildGrowthPeriod[];
    const vaccineSchedule = (scheduleRes.data ?? []) as VaccineDoseSchedule[];

    if (!child.local_id) {
      return NextResponse.json({
        child,
        milestoneChecks: [],
        measurements: [],
        vaccineRecords: [],
        vaccineSchedule,
        growthPeriods,
      });
    }

    const [checksRes, measurementsRes, vaccinesRes] = await Promise.all([
      client
        .from("child_milestone_checks")
        .select("*")
        .eq("user_id", child.user_id)
        .eq("child_local_id", child.local_id)
        .order("created_at", { ascending: false }),
      client
        .from("child_growth_measurements")
        .select("*")
        .eq("user_id", child.user_id)
        .eq("child_local_id", child.local_id)
        .order("measured_on", { ascending: true }),
      client
        .from("child_vaccine_records")
        .select("*")
        .eq("user_id", child.user_id)
        .eq("child_local_id", child.local_id)
        .order("age_months", { ascending: true }),
    ]);

    if (checksRes.error) {
      return NextResponse.json({ error: checksRes.error.message }, { status: 500 });
    }
    if (measurementsRes.error) {
      return NextResponse.json(
        { error: measurementsRes.error.message },
        { status: 500 },
      );
    }
    if (vaccinesRes.error) {
      return NextResponse.json({ error: vaccinesRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      child,
      milestoneChecks: (checksRes.data ?? []) as ChildMilestoneCheck[],
      measurements: (measurementsRes.data ?? []) as ChildGrowthMeasurement[],
      vaccineRecords: (vaccinesRes.data ?? []) as ChildVaccineRecord[],
      vaccineSchedule,
      growthPeriods,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminManagePermission("manage_users");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Child id is required" }, { status: 400 });
  }

  let patch: ChildUpdatePayload;
  try {
    patch = (await request.json()) as ChildUpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("children")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(CHILD_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ child: data as Child });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
