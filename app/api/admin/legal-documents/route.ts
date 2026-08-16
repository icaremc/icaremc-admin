import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { settingsUpdatedEventLabel } from "@/lib/activity/buildLog";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminPermission } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  DEFAULT_LEGAL_SLUGS,
  isLegalLocale,
  type LegalDocument,
  type LegalSection,
  normalizeLegalDocument,
} from "@/lib/legal/legalDocuments";

export async function GET() {
  const auth = await requireAdminPermission("manage_content");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("legal_documents")
      .select("slug, locale, title, sections, updated_at")
      .order("slug")
      .order("locale");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const documents = (data ?? []).map((row) =>
      normalizeLegalDocument(row as LegalDocument),
    );

    return NextResponse.json({
      documents,
      knownSlugs: DEFAULT_LEGAL_SLUGS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminPermission("manage_content");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    slug?: string;
    locale?: string;
    title?: string;
    sections?: LegalSection[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const title = body.title?.trim();
  const locale = body.locale?.trim() || "en";
  if (!slug || !title) {
    return NextResponse.json(
      { error: "slug and title are required" },
      { status: 400 },
    );
  }
  if (!isLegalLocale(locale)) {
    return NextResponse.json(
      { error: "locale must be en, am, or om" },
      { status: 400 },
    );
  }

  const sections = Array.isArray(body.sections) ? body.sections : [];
  const cleaned = sections
    .map((section) => ({
      title: String(section.title ?? "").trim(),
      body: String(section.body ?? "").trim(),
    }))
    .filter((section) => section.title || section.body);

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("legal_documents")
      .upsert(
        {
          slug,
          locale,
          title,
          sections: cleaned,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug,locale" },
      )
      .select("slug, locale, title, sections, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.SETTINGS_UPDATED,
        eventLabel: settingsUpdatedEventLabel(
          "legal document",
          `${slug} (${locale})`,
        ),
        resourceType: "legal_documents",
        resourceId: `${slug}:${locale}`,
      },
      request,
    );

    return NextResponse.json({
      document: normalizeLegalDocument(data as LegalDocument),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
