import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminViewPermission, requireSuperAdminSession } from "@/lib/adminAuth";
import {
  signedAdminDocumentUrl,
  uploadAdminDocument,
} from "@/lib/adminDocuments/storage";
import type { AdminDocument, AdminDocumentCategory } from "@/lib/adminDocuments/types";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const CATEGORIES = new Set<AdminDocumentCategory>(["agreement", "policy", "other"]);

function parseCategory(value: FormDataEntryValue | null): AdminDocumentCategory {
  const raw = typeof value === "string" ? value.trim() : "";
  return CATEGORIES.has(raw as AdminDocumentCategory)
    ? (raw as AdminDocumentCategory)
    : "other";
}

export async function GET() {
  const auth = await requireAdminViewPermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("admin_documents")
      .select(
        "id, title, category, storage_path, file_name, mime_type, uploaded_by, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const includePreview = auth.adminRole === "super_admin";

    const documents = await Promise.all(
      ((data as AdminDocument[] | null) ?? []).map(async (document) => ({
        ...document,
        preview_url: includePreview
          ? await signedAdminDocumentUrl(client, document.storage_path)
          : null,
      })),
    );

    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const titleRaw = formData.get("title");
  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const file = formData.get("file");
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
  }

  const category = parseCategory(formData.get("category"));

  try {
    const client = createServiceSupabaseClient();
    const { storagePath, mimeType } = await uploadAdminDocument(client, file);

    const { data, error } = await client
      .from("admin_documents")
      .insert({
        title,
        category,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: mimeType,
        uploaded_by: auth.user.id,
      })
      .select(
        "id, title, category, storage_path, file_name, mime_type, uploaded_by, created_at, updated_at",
      )
      .single();

    if (error) throw new Error(error.message);

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.CONTENT_SAVED,
        eventLabel: `Uploaded internal document: ${title}`,
        resourceType: "admin_document",
        resourceId: data.id,
      },
      request,
    );

    return NextResponse.json({
      document: {
        ...(data as AdminDocument),
        preview_url: await signedAdminDocumentUrl(client, data.storage_path),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 400 },
    );
  }
}
