import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  removePregnancyWeekImage,
  uploadPregnancyWeekImage,
} from "@/lib/pregnancyWeeks/storage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  try {
    const client = createServiceSupabaseClient();
    const formData = await request.formData();
    const image = formData.get("image");
    const removeImage = formData.get("remove_image") === "true";

    const { data: week, error: weekError } = await client
      .from("pregnancy_weeks")
      .select("id, week_number, image_url")
      .eq("id", id)
      .maybeSingle();

    if (weekError) {
      return NextResponse.json({ error: weekError.message }, { status: 500 });
    }
    if (!week) {
      return NextResponse.json({ error: "Pregnancy week not found." }, { status: 404 });
    }

    let imageUrl: string | null = week.image_url;

    if (removeImage) {
      await removePregnancyWeekImage(client, week.image_url);
      imageUrl = null;
    }

    if (image instanceof File && image.size > 0) {
      imageUrl = await uploadPregnancyWeekImage(
        client,
        week.id,
        week.week_number,
        image,
      );
    }

    const { data, error } = await client
      .from("pregnancy_weeks")
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, image_url")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ week: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const { data: week, error: weekError } = await client
      .from("pregnancy_weeks")
      .select("id, image_url")
      .eq("id", id)
      .maybeSingle();

    if (weekError) {
      return NextResponse.json({ error: weekError.message }, { status: 500 });
    }
    if (!week) {
      return NextResponse.json({ error: "Pregnancy week not found." }, { status: 404 });
    }

    await removePregnancyWeekImage(client, week.image_url);

    const { error } = await client
      .from("pregnancy_weeks")
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
