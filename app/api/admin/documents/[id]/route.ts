import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/adminAuth";
import { signedAdminDocumentUrl } from "@/lib/adminDocuments/storage";
import type { AdminDocument } from "@/lib/adminDocuments/types";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSuperAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Document id is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("admin_documents")
      .select(
        "id, title, category, storage_path, file_name, mime_type, uploaded_by, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      document: {
        ...(data as AdminDocument),
        preview_url: await signedAdminDocumentUrl(client, data.storage_path),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
