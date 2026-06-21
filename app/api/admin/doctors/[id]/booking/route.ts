import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

type BookingBody = {
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

    if (body.currency) {
      const { error } = await client
        .from("doctor_profiles")
        .update({
          currency: body.currency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (body.services) {
      const { data: existingServices, error: existingError } = await client
        .from("doctor_services")
        .select("id")
        .eq("doctor_id", id);

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 });
      }

      const keptIds = new Set(
        body.services.filter((service) => service.id).map((service) => service.id),
      );
      const removedIds = (existingServices ?? [])
        .map((row) => row.id as string)
        .filter((serviceId) => !keptIds.has(serviceId));

      if (removedIds.length > 0) {
        const { error: deleteError } = await client
          .from("doctor_services")
          .delete()
          .in("id", removedIds)
          .eq("doctor_id", id);
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }

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
