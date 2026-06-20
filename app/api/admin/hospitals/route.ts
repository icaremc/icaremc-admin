import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  nextHospitalSortOrder,
  slugifyHospitalName,
  uploadHospitalImage,
} from "@/lib/hospitals/storage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Hospital } from "@/lib/types/hospitals";

function readTextField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("hospitals")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ hospitals: (data ?? []) as Hospital[] });
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

  const slug = slugifyHospitalName(name);
  if (!slug) {
    return NextResponse.json(
      { error: "Hospital name must contain letters or numbers" },
      { status: 400 },
    );
  }

  const description = readTextField(formData, "description");
  const address = readTextField(formData, "address");
  const city = readTextField(formData, "city");
  const phone = readTextField(formData, "phone");
  const image = formData.get("image");

  try {
    const client = createServiceSupabaseClient();
    const sortOrder = await nextHospitalSortOrder(client);
    const { data: hospital, error } = await client
      .from("hospitals")
      .insert({
        name,
        slug,
        description: description || null,
        address: address || null,
        city: city || null,
        phone: phone || null,
        sort_order: sortOrder,
        is_active: true,
      })
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

    let imageUrl: string | null = null;
    if (image instanceof File && image.size > 0) {
      imageUrl = await uploadHospitalImage(client, hospital.id, image);
      const { data: updated, error: updateError } = await client
        .from("hospitals")
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq("id", hospital.id)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ hospital: updated as Hospital }, { status: 201 });
    }

    return NextResponse.json({ hospital: hospital as Hospital }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
