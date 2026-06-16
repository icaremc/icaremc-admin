import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { slugifyCategoryName } from "@/lib/doctors/display";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorCategory } from "@/lib/types/doctors";

function parseCreateBody(body: unknown): { name: string } | string {
  if (!body || typeof body !== "object") return "Invalid request body";

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) return "Name is required";

  return { name };
}

async function nextSortOrder(
  client: ReturnType<typeof createServiceSupabaseClient>,
): Promise<number> {
  const { data, error } = await client
    .from("doctor_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.sort_order ?? 0) + 1;
}

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("doctor_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: (data ?? []) as DoctorCategory[] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseCreateBody(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const slug = slugifyCategoryName(parsed.name);
  if (!slug) {
    return NextResponse.json(
      { error: "Category name must contain letters or numbers" },
      { status: 400 },
    );
  }

  try {
    const client = createServiceSupabaseClient();
    const sortOrder = await nextSortOrder(client);
    const { data, error } = await client
      .from("doctor_categories")
      .insert({
        name: parsed.name,
        slug,
        sort_order: sortOrder,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: data as DoctorCategory }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
