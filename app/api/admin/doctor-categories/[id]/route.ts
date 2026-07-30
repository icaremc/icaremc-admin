import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission } from "@/lib/adminAuth";
import { slugifyCategoryName } from "@/lib/doctors/display";
import { parseDoctorCategoryCareFocus } from "@/lib/doctors/careFocus";
import {
  nameTranslationRowsFromForm,
  readNameTranslationsFromFormData,
  type NameTranslationsForm,
} from "@/lib/i18n/nameTranslations";
import {
  removeSpecialityImage,
  uploadSpecialityImage,
} from "@/lib/specialities/storage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorCategory } from "@/lib/types/doctors";

type RouteContext = { params: Promise<{ id: string }> };

const CATEGORY_SELECT =
  "*, doctor_category_translations(id, category_id, language_code, name, created_at, updated_at)";

function readTextField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (value == null) return undefined;
  return typeof value === "string" ? value.trim() : "";
}

async function replaceCategoryTranslations(
  client: ReturnType<typeof createServiceSupabaseClient>,
  categoryId: string,
  form: NameTranslationsForm,
) {
  const rows = nameTranslationRowsFromForm(form).map((row) => ({
    category_id: categoryId,
    language_code: row.language_code,
    name: row.name,
  }));

  if (rows.length > 0) {
    const { error } = await client.from("doctor_category_translations").upsert(rows, {
      onConflict: "category_id,language_code",
    });
    if (error) throw new Error(error.message);
  }

  let deleteQuery = client
    .from("doctor_category_translations")
    .delete()
    .eq("category_id", categoryId);
  if (rows.length > 0) {
    deleteQuery = deleteQuery.not(
      "language_code",
      "in",
      `(${rows.map((row) => `"${row.language_code}"`).join(",")})`,
    );
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw new Error(deleteError.message);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminManagePermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    const client = createServiceSupabaseClient();
    const updates: Record<string, unknown> = {};
    let translations: NameTranslationsForm | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const hasNameField =
        formData.has("name_en") || formData.has("name") || formData.has("name_am") || formData.has("name_om");

      if (hasNameField) {
        const parsed = readNameTranslationsFromFormData(formData);
        if (typeof parsed === "string") {
          return NextResponse.json({ error: parsed }, { status: 400 });
        }
        translations = parsed;
        const name = parsed.en.name.trim();
        const slug = slugifyCategoryName(name);
        if (!slug) {
          return NextResponse.json(
            { error: "Speciality name must contain letters or numbers" },
            { status: 400 },
          );
        }
        updates.name = name;
        updates.slug = slug;
      }

      const careFocusRaw = readTextField(formData, "care_focus");
      if (careFocusRaw !== undefined && careFocusRaw !== "") {
        updates.care_focus = parseDoctorCategoryCareFocus(careFocusRaw);
      }

      const isActive = formData.get("is_active");
      if (typeof isActive === "string") {
        updates.is_active = isActive === "true";
      }

      const sortOrderRaw = formData.get("sort_order");
      if (typeof sortOrderRaw === "string" && sortOrderRaw.trim()) {
        const sortOrder = Number.parseInt(sortOrderRaw, 10);
        if (!Number.isInteger(sortOrder) || sortOrder < 1) {
          return NextResponse.json(
            { error: "Sort order must be a positive whole number" },
            { status: 400 },
          );
        }
        updates.sort_order = sortOrder;
      }

      const removeImage = formData.get("remove_image") === "true";
      if (removeImage) {
        const { data: existing } = await client
          .from("doctor_categories")
          .select("image_url")
          .eq("id", id)
          .maybeSingle();
        await removeSpecialityImage(client, existing?.image_url);
        updates.image_url = null;
      }

      const image = formData.get("image");
      if (image instanceof File && image.size > 0) {
        const imageUrl = await uploadSpecialityImage(client, id, image);
        updates.image_url = imageUrl;
      }
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }

      const data = body as Record<string, unknown>;

      if (typeof data.name === "string") {
        const name = data.name.trim();
        if (!name) {
          return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
        }
        const slug = slugifyCategoryName(name);
        if (!slug) {
          return NextResponse.json(
            { error: "Speciality name must contain letters or numbers" },
            { status: 400 },
          );
        }
        updates.name = name;
        updates.slug = slug;
      }

      if (typeof data.sort_order === "number" && Number.isInteger(data.sort_order)) {
        updates.sort_order = data.sort_order;
      }

      if (typeof data.is_active === "boolean") {
        updates.is_active = data.is_active;
      }

      if (typeof data.care_focus === "string") {
        updates.care_focus = parseDoctorCategoryCareFocus(data.care_focus);
      }
    }

    if (Object.keys(updates).length === 0 && !translations) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();

      const { error } = await client
        .from("doctor_categories")
        .update(updates)
        .eq("id", id);

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "A speciality with this name already exists" },
            { status: 400 },
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (translations) {
      await replaceCategoryTranslations(client, id, translations);
    }

    const { data: category, error: fetchError } = await client
      .from("doctor_categories")
      .select(CATEGORY_SELECT)
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.CATEGORY_UPDATED,
        eventLabel: `Updated speciality ${(category as DoctorCategory).name}`,
        resourceType: "doctor_category",
        resourceId: id,
      },
      request,
    );

    return NextResponse.json({ category: category as DoctorCategory });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminManagePermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const client = createServiceSupabaseClient();

    const { count, error: countError } = await client
      .from("doctor_profiles")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a speciality that doctors are using. Deactivate it instead.",
        },
        { status: 400 },
      );
    }

    const { data: existing } = await client
      .from("doctor_categories")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    await removeSpecialityImage(client, existing?.image_url);

    const { error } = await client.from("doctor_categories").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.CONTENT_DELETED,
        eventLabel: `Deleted speciality ${id}`,
        resourceType: "doctor_category",
        resourceId: id,
      },
      _request,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
