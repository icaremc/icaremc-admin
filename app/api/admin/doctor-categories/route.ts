import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission, requireAdminViewPermission } from "@/lib/adminAuth";
import { slugifyCategoryName } from "@/lib/doctors/display";
import { parseDoctorCategoryCareFocus } from "@/lib/doctors/careFocus";
import { uploadSpecialityImage } from "@/lib/specialities/storage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorCategory } from "@/lib/types/doctors";

function readTextField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
  const auth = await requireAdminViewPermission("manage_doctors");
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
  const auth = await requireAdminManagePermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const name = readTextField(formData, "name");
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugifyCategoryName(name);
  if (!slug) {
    return NextResponse.json(
      { error: "Speciality name must contain letters or numbers" },
      { status: 400 },
    );
  }

  const careFocus = parseDoctorCategoryCareFocus(
    readTextField(formData, "care_focus"),
  );
  const sortOrderRaw = readTextField(formData, "sort_order");
  const image = formData.get("image");

  try {
    const client = createServiceSupabaseClient();
    let sortOrder = await nextSortOrder(client);
    if (sortOrderRaw) {
      const parsed = Number.parseInt(sortOrderRaw, 10);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return NextResponse.json(
          { error: "Sort order must be a positive whole number" },
          { status: 400 },
        );
      }
      sortOrder = parsed;
    }
    const { data: category, error } = await client
      .from("doctor_categories")
      .insert({
        name,
        slug,
        care_focus: careFocus,
        sort_order: sortOrder,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A speciality with this name already exists" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (image instanceof File && image.size > 0) {
      const imageUrl = await uploadSpecialityImage(client, category.id, image);
      const { data: updated, error: updateError } = await client
        .from("doctor_categories")
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq("id", category.id)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await logAdminActivityFromAuth(
        auth,
        {
          eventType: ADMIN_ACTIVITY_EVENTS.CATEGORY_UPDATED,
          eventLabel: `Created speciality ${(updated as DoctorCategory).name}`,
          resourceType: "doctor_category",
          resourceId: category.id,
        },
        request,
      );

      return NextResponse.json({ category: updated as DoctorCategory }, { status: 201 });
    }

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.CATEGORY_UPDATED,
        eventLabel: `Created speciality ${(category as DoctorCategory).name}`,
        resourceType: "doctor_category",
        resourceId: category.id,
      },
      request,
    );

    return NextResponse.json({ category: category as DoctorCategory }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
