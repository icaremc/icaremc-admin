import { NextResponse } from "next/server";
import { requireAdminManagePermission } from "@/lib/adminAuth";
import { uploadLearningPathImages } from "@/lib/childGrowth/learningPathStorage";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const auth = await requireAdminManagePermission("manage_content");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  try {
    const formData = await request.formData();
    const files = formData
      .getAll("images")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Add at least one image file." },
        { status: 400 },
      );
    }

    if (files.length > 12) {
      return NextResponse.json(
        { error: "Upload up to 12 images at a time." },
        { status: 400 },
      );
    }

    const client = createServiceSupabaseClient();
    const urls = await uploadLearningPathImages(client, files);
    return NextResponse.json({ urls });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
