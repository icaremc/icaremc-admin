import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

type BookingBody = {
  prepayment_mode?: "none" | "percent" | "full";
  prepayment_percent?: number;
  currency?: string;
  services?: Array<{
    id?: string;
    name: string;
    description?: string | null;
    price: number;
    is_active?: boolean;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  let body: BookingBody;
  try {
    body = (await request.json()) as BookingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();

    if (
      body.prepayment_mode ||
      body.prepayment_percent !== undefined ||
      body.currency
    ) {
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (body.prepayment_mode) update.prepayment_mode = body.prepayment_mode;
      if (body.prepayment_percent !== undefined) {
        update.prepayment_percent = body.prepayment_percent;
      }
      if (body.currency) update.currency = body.currency;

      const { error } = await client
        .from("doctor_profiles")
        .update(update)
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (body.services) {
      for (const [index, service] of body.services.entries()) {
        const payload = {
          doctor_id: id,
          name: service.name.trim(),
          description: service.description?.trim() || null,
          price: service.price,
          is_active: service.is_active ?? true,
          sort_order: index,
          updated_at: new Date().toISOString(),
        };

        if (service.id) {
          const { error } = await client
            .from("doctor_services")
            .update(payload)
            .eq("id", service.id)
            .eq("doctor_id", id);
          if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
        } else if (service.name.trim()) {
          const { error } = await client.from("doctor_services").insert(payload);
          if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
        }
      }
    }

    const { data, error } = await client
      .from("doctor_profiles")
      .select("*, doctor_services(*)")
      .eq("id", id)
      .order("sort_order", { foreignTable: "doctor_services", ascending: true })
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ doctor: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
