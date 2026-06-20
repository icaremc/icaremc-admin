import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  removeHospitalImage,
  slugifyHospitalName,
  uploadHospitalImage,
} from "@/lib/hospitals/storage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Hospital } from "@/lib/types/hospitals";

type RouteContext = { params: Promise<{ id: string }> };

function readTextField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (value == null) return undefined;
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    const client = createServiceSupabaseClient();
    const updates: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const name = readTextField(formData, "name");
      const description = readTextField(formData, "description");
      const address = readTextField(formData, "address");
      const city = readTextField(formData, "city");
      const phone = readTextField(formData, "phone");
      const isActive = formData.get("is_active");
      const image = formData.get("image");
      const removeImage = formData.get("remove_image") === "true";

      if (name !== undefined) {
        if (!name) {
          return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
        }
        const slug = slugifyHospitalName(name);
        if (!slug) {
          return NextResponse.json(
            { error: "Hospital name must contain letters or numbers" },
            { status: 400 },
          );
        }
        updates.name = name;
        updates.slug = slug;
      }

      if (description !== undefined) updates.description = description || null;
      if (address !== undefined) updates.address = address || null;
      if (city !== undefined) updates.city = city || null;
      if (phone !== undefined) updates.phone = phone || null;
      if (typeof isActive === "string") {
        updates.is_active = isActive === "true";
      }

      if (removeImage) {
        const { data: existing } = await client
          .from("hospitals")
          .select("image_url")
          .eq("id", id)
          .maybeSingle();
        await removeHospitalImage(client, existing?.image_url);
        updates.image_url = null;
      }

      if (image instanceof File && image.size > 0) {
        const imageUrl = await uploadHospitalImage(client, id, image);
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
        const slug = slugifyHospitalName(name);
        if (!slug) {
          return NextResponse.json(
            { error: "Hospital name must contain letters or numbers" },
            { status: 400 },
          );
        }
        updates.name = name;
        updates.slug = slug;
      }

      if (typeof data.description === "string") {
        updates.description = data.description.trim() || null;
      }
      if (typeof data.address === "string") {
        updates.address = data.address.trim() || null;
      }
      if (typeof data.city === "string") {
        updates.city = data.city.trim() || null;
      }
      if (typeof data.phone === "string") {
        updates.phone = data.phone.trim() || null;
      }
      if (typeof data.sort_order === "number" && Number.isInteger(data.sort_order)) {
        updates.sort_order = data.sort_order;
      }
      if (typeof data.is_active === "boolean") {
        updates.is_active = data.is_active;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: hospital, error } = await client
      .from("hospitals")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A hospital with this name already exists" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ hospital: hospital as Hospital });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const client = createServiceSupabaseClient();

    const { count, error: countError } = await client
      .from("doctor_hospital_affiliations")
      .select("doctor_id", { count: "exact", head: true })
      .eq("hospital_id", id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a hospital that doctors are linked to. Deactivate it instead.",
        },
        { status: 400 },
      );
    }

    const { data: existing } = await client
      .from("hospitals")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    await removeHospitalImage(client, existing?.image_url);

    const { error } = await client.from("hospitals").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
