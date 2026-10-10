import { NextResponse } from "next/server";
import { adaptBackendResponse } from "@/lib/backend/adapters";
import {
  BACKEND_ACCESS_COOKIE,
  getBackendApiBaseUrl,
  isBackendApiEnabled,
  resolveBackendMediaUrl,
} from "@/lib/backend/config";
import { mapAdminApiToBackend } from "@/lib/backend/capabilities";
import { signedAdminDocumentUrl } from "@/lib/adminDocuments/storage";
import { slugifyHospitalName } from "@/lib/hospitals/storage";
import { saveNotification } from "@/lib/push/saveNotification";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

/** Doctor/mother apps still read the Supabase `notifications` inbox. */
async function mirrorPushToSupabaseInbox(input: {
  userId: string;
  title: string;
  body: string;
  route?: string;
}) {
  // ponytail: dual-write until doctor/mother apps read /api/v1/*/notifications
  try {
    const client = createServiceSupabaseClient();
    await saveNotification(client, input.userId, {
      title: input.title,
      body: input.body,
      route: input.route,
      type: "chat",
    });
  } catch (error) {
    console.error(
      "[staging-push] supabase inbox mirror failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

export function readAccessToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${BACKEND_ACCESS_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodeJson(value: unknown): ArrayBuffer {
  return new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer;
}

function readFormText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Admin hospitals UI posts multipart; staging API expects JSON HospitalIn with slug. */
async function rewriteHospitalMultipart(
  method: string,
  rawBody: ArrayBuffer,
  contentType: string,
  accessToken: string | null,
): Promise<{ method: string; body: ArrayBuffer; contentType: string } | { error: string }> {
  const form = await new Request("http://local", {
    method,
    headers: { "content-type": contentType },
    body: rawBody,
  }).formData();

  const name = readFormText(form, "name");
  const payload: Record<string, unknown> = {};

  if (name) {
    const slug = slugifyHospitalName(name);
    if (!slug) {
      return { error: "Hospital name must contain letters or numbers" };
    }
    payload.name = name;
    payload.slug = slug;
  } else if (method === "POST") {
    return { error: "Name is required" };
  }

  for (const key of ["description", "address", "city", "phone"] as const) {
    if (form.has(key)) {
      payload[key] = readFormText(form, key) || null;
    }
  }

  const imageUrlField = readFormText(form, "image_url");
  if (imageUrlField) payload.image_url = imageUrlField;

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    const uploadForm = new FormData();
    uploadForm.set("file", image);
    const uploadHeaders = new Headers();
    if (accessToken) uploadHeaders.set("Authorization", `Bearer ${accessToken}`);
    try {
      const uploadRes = await fetch(`${getBackendApiBaseUrl()}/api/v1/uploads/`, {
        method: "POST",
        headers: uploadHeaders,
        body: uploadForm,
      });
      const uploadBody = (await uploadRes.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!uploadRes.ok || !uploadBody?.url) {
        return {
          error:
            uploadBody?.error ??
            "Could not upload hospital image to staging. Try again without an image.",
        };
      }
      payload.image_url =
        resolveBackendMediaUrl(uploadBody.url) ?? uploadBody.url;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Could not upload hospital image to staging",
      };
    }
  }

  if (method === "POST") {
    payload.is_active = true;
  }

  return {
    method,
    body: encodeJson(payload),
    contentType: "application/json",
  };
}

// ponytail: CMS enrichment is slow (~10s/lang); parallel + 60s cache until admin GET nests translations
const PREGNANCY_CMS_ENRICH_TTL_MS = 60_000;
let pregnancyCmsEnrichCache: {
  at: number;
  byId: Map<string, Record<string, unknown>[]>;
} | null = null;

/** ponytail: backend document rows omit signed URLs; mint via Supabase when credentials exist */
async function enrichDocumentsWithPreviewUrls(
  body: unknown,
): Promise<unknown> {
  const rows = Array.isArray(body)
    ? body.filter(isPlainObject)
    : isPlainObject(body) && Array.isArray(body.documents)
      ? body.documents.filter(isPlainObject)
      : null;
  if (!rows || rows.length === 0) return body;

  if (rows.every((row) => row.preview_url || row.previewUrl)) {
    if (Array.isArray(body)) return rows;
    return isPlainObject(body) ? { ...body, documents: rows } : body;
  }

  try {
    const client = createServiceSupabaseClient();
    const enriched = await Promise.all(
      rows.map(async (row) => {
        if (row.preview_url || row.previewUrl) {
          return {
            ...row,
            preview_url: row.preview_url ?? row.previewUrl ?? null,
          };
        }
        const storagePath = String(row.storage_path ?? row.storagePath ?? "");
        const preview_url = storagePath
          ? await signedAdminDocumentUrl(client, storagePath)
          : null;
        return { ...row, preview_url };
      }),
    );
    if (Array.isArray(body)) return enriched;
    return isPlainObject(body) ? { ...body, documents: enriched } : body;
  } catch {
    return body;
  }
}

async function enrichPregnancyWeeksFromPublicCms(
  weeks: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (weeks.length === 0) return weeks;
  const alreadyNested = weeks.some((week) => {
    const nested = week.pregnancy_week_translations;
    return Array.isArray(nested) && nested.length > 0;
  });
  if (alreadyNested) {
    pregnancyCmsEnrichCache = null;
    return weeks;
  }

  const now = Date.now();
  let byId = pregnancyCmsEnrichCache?.byId ?? null;
  if (
    !byId ||
    !pregnancyCmsEnrichCache ||
    now - pregnancyCmsEnrichCache.at > PREGNANCY_CMS_ENRICH_TTL_MS
  ) {
    const base = getBackendApiBaseUrl();
    byId = new Map<string, Record<string, unknown>[]>();
    const localeRows = await Promise.all(
      (["en", "am", "om"] as const).map(async (lang) => {
        try {
          const res = await fetch(
            `${base}/api/v1/cms/pregnancy-weeks?lang=${lang}`,
            { cache: "no-store" },
          );
          if (!res.ok) return [] as unknown[];
          const rows = (await res.json()) as unknown;
          return Array.isArray(rows) ? rows : [];
        } catch {
          return [] as unknown[];
        }
      }),
    );
    for (const rows of localeRows) {
      for (const row of rows) {
        if (!isPlainObject(row) || !isPlainObject(row.translation)) continue;
        const id = String(row.id);
        const list = byId.get(id) ?? [];
        list.push({
          ...row.translation,
          pregnancy_week_id: id,
        });
        byId.set(id, list);
      }
    }
    pregnancyCmsEnrichCache = { at: now, byId };
  }

  return weeks.map((week) => {
    const translations = byId!.get(String(week.id));
    if (!translations?.length) return week;
    return { ...week, pregnancy_week_translations: translations };
  });
}

async function uploadStagingImage(
  file: File,
  accessToken: string,
): Promise<{ url?: string; error?: string }> {
  const uploadForm = new FormData();
  uploadForm.set("file", file);
  const uploadRes = await fetch(`${getBackendApiBaseUrl()}/api/v1/uploads/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: uploadForm,
  });
  const uploadBody = (await uploadRes.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;
  if (!uploadRes.ok || !uploadBody?.url) {
    return {
      error: uploadBody?.error ?? "Could not upload image to staging.",
    };
  }
  return { url: resolveBackendMediaUrl(uploadBody.url) ?? uploadBody.url };
}

/** Rewrite admin request bodies/methods to match Render admin API shapes. */
async function rewriteUpstreamRequest(
  adminPath: string,
  method: string,
  rawBody: ArrayBuffer | null,
  contentType: string | null,
  accessToken: string | null = null,
): Promise<
  | { method: string; body: ArrayBuffer | null; contentType: string | null }
  | { error: string; status?: number }
> {
  const path = adminPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);
  const head = segments[0] ?? "";
  const rest = segments.slice(1);
  const upper = method.toUpperCase();

  if (!rawBody || rawBody.byteLength === 0) {
    return { method: upper, body: null, contentType: null };
  }

  if (
    head === "hospitals" &&
    (upper === "POST" || upper === "PATCH") &&
    contentType?.includes("multipart/form-data")
  ) {
    return rewriteHospitalMultipart(upper, rawBody, contentType, accessToken);
  }

  // Staging uploads API is image-only; PDF multipart document create stays unsupported.
  if (
    head === "documents" &&
    upper === "POST" &&
    contentType?.includes("multipart/form-data")
  ) {
    return {
      error:
        "Staging document upload expects JSON DocumentIn after a separate file host. Multipart PDF upload is not on the staging uploads API yet.",
      status: 501,
    };
  }

  // Grant membership: admin posts multipart with receipt; staging expects JSON SubscriptionGrantIn
  if (
    head === "app-membership-members" &&
    rest[1] === "grant" &&
    upper === "POST" &&
    contentType?.includes("multipart/form-data")
  ) {
    const form = await new Request("http://local", {
      method: upper,
      headers: { "content-type": contentType },
      body: rawBody,
    }).formData();
    const daysRaw = readFormText(form, "durationDays");
    const amountRaw = readFormText(form, "amountPaid");
    const days = Number.parseInt(daysRaw, 10);
    const amountPaid = Number.parseFloat(amountRaw);
    return {
      method: "POST",
      body: encodeJson({
        patient_id: rest[0],
        days: Number.isFinite(days) && days > 0 ? days : 365,
        amount_paid: Number.isFinite(amountPaid) ? amountPaid : 0,
        // ponytail: staging has no receipt upload; receipt file is dropped
        admin_receipt_url: null,
      }),
      contentType: "application/json",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return {
      error: "Staging backend expects JSON for this request",
      status: 400,
    };
  }

  // JSON hospital create/update: ensure slug when name is present
  if (head === "hospitals" && (upper === "POST" || upper === "PATCH") && isPlainObject(parsed)) {
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    if (name && typeof parsed.slug !== "string") {
      const slug = slugifyHospitalName(name);
      if (!slug) {
        return { error: "Hospital name must contain letters or numbers", status: 400 };
      }
      return {
        method: upper,
        body: encodeJson({ ...parsed, name, slug }),
        contentType: "application/json",
      };
    }
  }

  // PATCH /payout-requests/:id { action, adminNote } → POST { status, admin_note }
  if (head === "payout-requests" && rest.length === 1 && (upper === "PATCH" || upper === "POST")) {
    if (isPlainObject(parsed) && typeof parsed.action === "string") {
      const statusMap: Record<string, string> = {
        approve: "approved",
        reject: "rejected",
        complete: "completed",
      };
      const status = statusMap[parsed.action] ?? parsed.action;
      const rewritten = {
        status,
        admin_note:
          typeof parsed.adminNote === "string"
            ? parsed.adminNote
            : typeof parsed.admin_note === "string"
              ? parsed.admin_note
              : null,
      };
      return {
        method: "POST",
        body: encodeJson(rewritten),
        contentType: "application/json",
      };
    }
  }

  // POST /users|:id/push or /doctors/:id/push → /push/notify
  if (
    (head === "users" || head === "doctors") &&
    rest.length === 2 &&
    rest[1] === "push" &&
    upper === "POST"
  ) {
    if (isPlainObject(parsed)) {
      const type =
        typeof parsed.type === "string" && parsed.type.trim()
          ? parsed.type.trim()
          : "chat";
      const route =
        typeof parsed.route === "string" && parsed.route.trim()
          ? parsed.route.trim()
          : undefined;
      const rewritten = {
        user_id: rest[0],
        title: typeof parsed.title === "string" ? parsed.title : "",
        body: typeof parsed.body === "string" ? parsed.body : "",
        type,
        data: {
          type,
          ...(route ? { route } : {}),
        },
      };
      return {
        method: "POST",
        body: encodeJson(rewritten),
        contentType: "application/json",
      };
    }
  }

  // PATCH app-version-settings → PUT settings { data }
  if (head === "app-version-settings" && (upper === "PATCH" || upper === "PUT")) {
    if (isPlainObject(parsed)) {
      const data = parsed.appVersionSettings ?? parsed.data ?? parsed;
      return {
        method: "PUT",
        body: encodeJson({ data }),
        contentType: "application/json",
      };
    }
  }

  // PATCH finance/payment/app-membership/referral settings → PUT { data }
  if (
    (head === "finance-settings" ||
      head === "payment-settings" ||
      head === "app-membership-settings" ||
      head === "referral-settings") &&
    (upper === "PATCH" || upper === "PUT")
  ) {
    if (isPlainObject(parsed)) {
      const data =
        parsed.financeSettings ??
        parsed.paymentSettings ??
        parsed.appMembershipSettings ??
        parsed.referralSettings ??
        parsed.data ??
        parsed;
      return {
        method: "PUT",
        body: encodeJson({ data }),
        contentType: "application/json",
      };
    }
  }

  // PATCH /admins { id, fields } → strip id (path carries it)
  if (head === "admins" && upper === "PATCH" && isPlainObject(parsed)) {
    const { id: _id, ...restBody } = parsed;
    return {
      method: "PATCH",
      body: encodeJson(restBody),
      contentType: "application/json",
    };
  }

  // POST documents multipart is not supported on staging uploads (images only).
  // JSON DocumentIn is accepted as-is.

  // Legal docs: admin UI PATCHes; OpenAPI only accepts PUT LegalIn
  if (head === "legal-documents" && (upper === "PATCH" || upper === "PUT")) {
    return {
      method: "PUT",
      body: encodeJson(parsed),
      contentType: "application/json",
    };
  }

  // Membership grant: path patient id → JSON { patient_id, … }
  if (
    head === "app-membership-members" &&
    rest[1] === "grant" &&
    upper === "POST" &&
    isPlainObject(parsed)
  ) {
    return {
      method: "POST",
      body: encodeJson({
        patient_id: rest[0],
        days: parsed.days ?? parsed.durationDays ?? 365,
        amount_paid: parsed.amount_paid ?? parsed.amountPaid ?? 0,
        admin_receipt_url:
          parsed.admin_receipt_url ?? parsed.adminReceiptUrl ?? null,
      }),
      contentType: "application/json",
    };
  }

  return { method: upper, body: rawBody, contentType: "application/json" };
}

export async function proxyAdminRequestToBackend(
  request: Request,
  adminPath: string,
): Promise<NextResponse> {
  if (!isBackendApiEnabled()) {
    return NextResponse.json(
      { error: "Backend API mode is disabled", stagingUnavailable: false },
      { status: 404 },
    );
  }

  const incomingUrl = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = adminPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);
  const head = segments[0] ?? "";
  const rest = segments.slice(1);

  // Delivery history is proxied to GET /api/v1/admin/doctors/{id}/document-deliveries

  let backendPath = mapAdminApiToBackend(adminPath, {
    method,
    searchParams: incomingUrl.searchParams,
  });

  const token = readAccessToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Not signed in to staging backend. Sign in again.", stagingUnavailable: false },
      { status: 401 },
    );
  }

  const rawBody =
    method !== "GET" && method !== "HEAD" ? await request.arrayBuffer() : null;

  // POST doctors/:id/document-deliveries { documentId } → documents/:docId/deliver?recipient_id=
  if (backendPath === "__document_deliver__") {
    let documentId = "";
    try {
      const parsed = JSON.parse(new TextDecoder().decode(rawBody ?? new ArrayBuffer(0))) as {
        documentId?: string;
        document_id?: string;
      };
      documentId = String(parsed.documentId ?? parsed.document_id ?? "").trim();
    } catch {
      documentId = "";
    }
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }
    backendPath = `/api/v1/admin/documents/${documentId}/deliver`;
    incomingUrl.searchParams.set("recipient_id", rest[0] ?? "");
  }

  // PATCH /admins { id, … } → PATCH /admins/{id}
  if (backendPath === "__admin_patch__") {
    let adminId = "";
    try {
      const parsed = JSON.parse(new TextDecoder().decode(rawBody ?? new ArrayBuffer(0))) as {
        id?: string;
      };
      adminId = String(parsed.id ?? "").trim();
    } catch {
      adminId = "";
    }
    if (!adminId) {
      return NextResponse.json({ error: "Admin id is required" }, { status: 400 });
    }
    backendPath = `/api/v1/admin/admins/${adminId}`;
  }

  if (!backendPath) {
    return NextResponse.json(
      {
        error: `No staging backend mapping for /api/admin/${path} (${method}).`,
        stagingUnavailable: true,
        adminPath,
      },
      { status: 501 },
    );
  }

  // Child detail = child row + measurements + milestones + vaccines + growth periods
  if (backendPath === "__child_detail__") {
    const childId = rest[0] ?? "";
    const base = getBackendApiBaseUrl();
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [childRes, measurementsRes, milestonesRes, vaccinesRes, periodsRes] =
        await Promise.all([
          fetch(`${base}/api/v1/admin/children/${childId}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${base}/api/v1/admin/children/${childId}/measurements`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${base}/api/v1/admin/children/${childId}/milestones`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${base}/api/v1/admin/children/${childId}/vaccines`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${base}/api/v1/admin/child-growth-periods`, {
            headers,
            cache: "no-store",
          }),
        ]);

      if (!childRes.ok) {
        const text = await childRes.text();
        try {
          return NextResponse.json(text ? JSON.parse(text) : null, {
            status: childRes.status,
          });
        } catch {
          return new NextResponse(text, { status: childRes.status });
        }
      }

      const childBody = (await childRes.json()) as unknown;
      const measurementsBody = measurementsRes.ok
        ? await measurementsRes.json()
        : [];
      const milestonesBody = milestonesRes.ok
        ? await milestonesRes.json()
        : [];
      const vaccinesBody = vaccinesRes.ok ? await vaccinesRes.json() : [];
      const periodsBody = periodsRes.ok ? await periodsRes.json() : [];

      const childRow =
        typeof childBody === "object" &&
        childBody !== null &&
        "child" in childBody &&
        typeof (childBody as { child: unknown }).child === "object"
          ? (childBody as { child: unknown }).child
          : childBody;

      const asList = (value: unknown, keys: string[]): unknown[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === "object" && value !== null) {
          const record = value as Record<string, unknown>;
          for (const key of keys) {
            if (Array.isArray(record[key])) return record[key] as unknown[];
          }
        }
        return [];
      };

      const adapted = adaptBackendResponse(
        adminPath,
        method,
        200,
        {
          child: childRow,
          measurements: asList(measurementsBody, ["measurements", "items", "data"]),
          milestones: asList(milestonesBody, [
            "milestones",
            "milestoneChecks",
            "items",
            "data",
          ]),
          vaccines: asList(vaccinesBody, [
            "vaccines",
            "vaccineRecords",
            "items",
            "data",
          ]),
          growthPeriods: asList(periodsBody, [
            "periods",
            "items",
            "data",
            "child_growth_periods",
          ]),
        },
        { searchParams: incomingUrl.searchParams },
      );
      return NextResponse.json(adapted, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to reach staging backend",
          stagingUnavailable: true,
        },
        { status: 502 },
      );
    }
  }

  // Doctor detail = admin doctor list row + admin services endpoint
  if (backendPath === "__doctor_detail__") {
    const doctorId = rest[0] ?? "";
    const base = getBackendApiBaseUrl();
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [doctorsRes, servicesRes] = await Promise.all([
        fetch(`${base}/api/v1/admin/doctors`, { headers, cache: "no-store" }),
        fetch(`${base}/api/v1/admin/doctors/${doctorId}/services`, {
          headers,
          cache: "no-store",
        }),
      ]);
      if (!doctorsRes.ok) {
        const text = await doctorsRes.text();
        try {
          return NextResponse.json(text ? JSON.parse(text) : null, {
            status: doctorsRes.status,
          });
        } catch {
          return new NextResponse(text, { status: doctorsRes.status });
        }
      }
      const doctorsBody = (await doctorsRes.json()) as unknown;
      const servicesBody = servicesRes.ok ? await servicesRes.json() : [];
      const doctors = Array.isArray(doctorsBody) ? doctorsBody : [];
      const doctor =
        doctors.find(
          (row) =>
            typeof row === "object" &&
            row !== null &&
            String((row as { id?: unknown }).id) === doctorId,
        ) ?? null;
      if (!doctor) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }
      const adapted = adaptBackendResponse(
        adminPath,
        method,
        200,
        {
          doctor,
          services: Array.isArray(servicesBody) ? servicesBody : [],
          slots: [],
        },
        { searchParams: incomingUrl.searchParams },
      );
      return NextResponse.json(adapted, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to reach staging backend",
          stagingUnavailable: true,
        },
        { status: 502 },
      );
    }
  }

  // Pregnancy week image → staging uploads + PATCH week.image_url
  if (backendPath === "__pregnancy_week_image__") {
    const weekId = rest[0] ?? "";
    if (!weekId) {
      return NextResponse.json({ error: "Week id is required" }, { status: 400 });
    }
    let imageUrl: string | null = null;
    if (method === "DELETE") {
      imageUrl = null;
    } else {
      const contentType = request.headers.get("content-type") ?? "";
      if (!contentType.includes("multipart/form-data") || !rawBody) {
        return NextResponse.json(
          { error: "Expected multipart/form-data with image" },
          { status: 400 },
        );
      }
      const form = await new Request("http://local", {
        method,
        headers: { "content-type": contentType },
        body: rawBody,
      }).formData();
      if (readFormText(form, "remove_image") === "true") {
        imageUrl = null;
      } else {
        const image = form.get("image");
        if (!(image instanceof File) || image.size === 0) {
          return NextResponse.json({ error: "Image file is required" }, { status: 400 });
        }
        try {
          const uploaded = await uploadStagingImage(image, token);
          if (!uploaded.url) {
            return NextResponse.json(
              { error: uploaded.error ?? "Image upload failed" },
              { status: 502 },
            );
          }
          imageUrl = uploaded.url;
        } catch (error) {
          return NextResponse.json(
            {
              error:
                error instanceof Error ? error.message : "Image upload failed",
            },
            { status: 502 },
          );
        }
      }
    }
    try {
      const patchRes = await fetch(
        `${getBackendApiBaseUrl()}/api/v1/admin/pregnancy-weeks/${weekId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image_url: imageUrl }),
          cache: "no-store",
        },
      );
      const text = await patchRes.text();
      const parsed = text ? JSON.parse(text) : null;
      if (!patchRes.ok) {
        return NextResponse.json(
          isPlainObject(parsed) ? parsed : { error: "Failed to update week image" },
          { status: patchRes.status },
        );
      }
      const adapted = adaptBackendResponse(
        `pregnancy-weeks/${weekId}`,
        "PATCH",
        200,
        parsed,
      );
      return NextResponse.json(adapted, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to update week image",
        },
        { status: 502 },
      );
    }
  }

  // Learning-path images → staging uploads API (returns URL list)
  if (backendPath === "__learning_path_images__") {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data") || !rawBody) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 },
      );
    }
    try {
      const form = await new Request("http://local", {
        method,
        headers: { "content-type": contentType },
        body: rawBody,
      }).formData();
      const files = form
        .getAll("images")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);
      if (files.length === 0) {
        return NextResponse.json(
          { error: "Add at least one image file." },
          { status: 400 },
        );
      }
      const urls: string[] = [];
      for (const file of files) {
        const uploaded = await uploadStagingImage(file, token);
        if (!uploaded.url) {
          return NextResponse.json(
            { error: uploaded.error ?? "Image upload failed" },
            { status: 502 },
          );
        }
        urls.push(uploaded.url);
      }
      return NextResponse.json({ urls }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Image upload failed",
        },
        { status: 502 },
      );
    }
  }

  const target = new URL(`${getBackendApiBaseUrl()}${backendPath}`);
  incomingUrl.searchParams.forEach((value, key) => {
    if (key === "app" && adminPath.replace(/^\/+/, "").startsWith("app-version-settings")) {
      return;
    }
    // ponytail: FE filters these client-side; backend activity-logs only accepts source/limit/offset
    if (
      head === "activity-logs" &&
      (key === "event_type" || key === "actor_type")
    ) {
      return;
    }
    target.searchParams.set(key, value);
  });

  const rewritten = await rewriteUpstreamRequest(
    adminPath,
    method,
    rawBody,
    request.headers.get("content-type"),
    token,
  );

  if ("error" in rewritten) {
    return NextResponse.json(
      { error: rewritten.error, stagingUnavailable: false },
      { status: rewritten.status ?? 400 },
    );
  }

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  if (rewritten.contentType) headers.set("Content-Type", rewritten.contentType);

  const init: RequestInit = {
    method: rewritten.method,
    headers,
    cache: "no-store",
  };
  if (rewritten.body) init.body = rewritten.body;

  try {
    const upstream = await fetch(target, init);
    // ponytail: DELETE 204 has empty body; NextResponse.json(null) breaks clients
    if (upstream.status === 204 || upstream.status === 205) {
      return new NextResponse(null, { status: upstream.status });
    }
    const text = await upstream.text();
    if (!text) {
      return new NextResponse(null, { status: upstream.status });
    }
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": upstream.headers.get("content-type") ?? "text/plain" },
      });
    }

    let bodyForAdapt = parsed;
    if (
      upstream.ok &&
      method === "GET" &&
      head === "pregnancy-weeks" &&
      rest.length === 0 &&
      Array.isArray(parsed)
    ) {
      bodyForAdapt = await enrichPregnancyWeeksFromPublicCms(
        parsed.filter(isPlainObject),
      );
    }
    if (
      upstream.ok &&
      method === "GET" &&
      head === "documents" &&
      rest.length === 0
    ) {
      bodyForAdapt = await enrichDocumentsWithPreviewUrls(parsed);
    }

    const adapted = adaptBackendResponse(
      adminPath,
      method,
      upstream.status,
      bodyForAdapt,
      { searchParams: incomingUrl.searchParams },
    );

    if (
      isPlainObject(adapted) &&
      adapted.stagingNotFound === true
    ) {
      return NextResponse.json(
        { error: typeof adapted.error === "string" ? adapted.error : "Not found" },
        { status: 404 },
      );
    }

    // Doctor/mother inbox still reads Supabase; new API only writes its own DB.
    if (
      upstream.ok &&
      method === "POST" &&
      (head === "doctors" || head === "users") &&
      rest.length === 2 &&
      rest[1] === "push" &&
      rewritten.body
    ) {
      try {
        const pushBody = JSON.parse(
          new TextDecoder().decode(rewritten.body),
        ) as {
          user_id?: string;
          title?: string;
          body?: string;
          type?: string;
          data?: { route?: string };
        };
        const userId = String(pushBody.user_id ?? rest[0] ?? "").trim();
        const title = String(pushBody.title ?? "").trim();
        const body = String(pushBody.body ?? "").trim();
        if (userId && (title || body)) {
          await mirrorPushToSupabaseInbox({
            userId,
            title: title || "Notification",
            body,
            route: pushBody.data?.route,
          });
        }
      } catch (error) {
        console.error(
          "[staging-push] failed to parse push body for inbox mirror:",
          error instanceof Error ? error.message : error,
        );
      }
    }

    return NextResponse.json(adapted, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach staging backend",
        stagingUnavailable: true,
      },
      { status: 502 },
    );
  }
}
