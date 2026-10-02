import { NextResponse } from "next/server";
import { adaptBackendResponse } from "@/lib/backend/adapters";
import {
  BACKEND_ACCESS_COOKIE,
  getBackendApiBaseUrl,
  isBackendApiEnabled,
} from "@/lib/backend/config";
import { mapAdminApiToBackend } from "@/lib/backend/capabilities";
import { slugifyHospitalName } from "@/lib/hospitals/storage";

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
      payload.image_url = uploadBody.url;
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

  // PATCH /doctors/:id { is_verified } → POST /doctors/:id/verify
  if (head === "doctors" && rest.length === 1 && upper === "PATCH") {
    return {
      method: "POST",
      body: encodeJson(parsed),
      contentType: "application/json",
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
      const rewritten = {
        user_id: rest[0],
        title: typeof parsed.title === "string" ? parsed.title : "",
        body: typeof parsed.body === "string" ? parsed.body : "",
        type: "generic",
        data:
          typeof parsed.route === "string" && parsed.route
            ? { route: parsed.route }
            : {},
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

  // PATCH finance/payment/app-membership settings → PUT { data }
  if (
    (head === "finance-settings" ||
      head === "payment-settings" ||
      head === "app-membership-settings") &&
    (upper === "PATCH" || upper === "PUT")
  ) {
    if (isPlainObject(parsed)) {
      const data =
        parsed.financeSettings ??
        parsed.paymentSettings ??
        parsed.appMembershipSettings ??
        parsed.data ??
        parsed;
      return {
        method: "PUT",
        body: encodeJson({ data }),
        contentType: "application/json",
      };
    }
  }

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

  // Delivery history has no OpenAPI admin endpoint — don't fail the doctor docs panel
  if (
    head === "doctors" &&
    rest.length === 2 &&
    rest[1] === "document-deliveries" &&
    method === "GET"
  ) {
    return NextResponse.json({
      deliveries: [],
      stagingPartial: true,
      message: "Document delivery history is not available on the staging API yet.",
    });
  }

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

  if (!backendPath) {
    return NextResponse.json(
      {
        error:
          "This admin API is not available on the staging Render backend yet. Production still uses Supabase.",
        stagingUnavailable: true,
        adminPath,
      },
      { status: 501 },
    );
  }

  // Activity "all" = merge admin + platform feeds
  if (backendPath === "__activity_all__") {
    const base = getBackendApiBaseUrl();
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [adminRes, platformRes] = await Promise.all([
        fetch(`${base}/api/v1/admin/activity/admin`, { headers, cache: "no-store" }),
        fetch(`${base}/api/v1/admin/activity/platform`, { headers, cache: "no-store" }),
      ]);
      const adminBody = adminRes.ok ? await adminRes.json() : [];
      const platformBody = platformRes.ok ? await platformRes.json() : [];
      const merged = [
        ...(Array.isArray(adminBody) ? adminBody : []),
        ...(Array.isArray(platformBody) ? platformBody : []),
      ];
      const adapted = adaptBackendResponse(adminPath, method, 200, merged, {
        searchParams: incomingUrl.searchParams,
      });
      return NextResponse.json(adapted, {
        status: adminRes.ok || platformRes.ok ? 200 : 502,
      });
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

  const target = new URL(`${getBackendApiBaseUrl()}${backendPath}`);
  incomingUrl.searchParams.forEach((value, key) => {
    if (key === "app" && adminPath.replace(/^\/+/, "").startsWith("app-version-settings")) {
      return;
    }
    if (key === "source" && head === "activity-logs") return;
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
    const text = await upstream.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": upstream.headers.get("content-type") ?? "text/plain" },
      });
    }

    const adapted = adaptBackendResponse(
      adminPath,
      method,
      upstream.status,
      parsed,
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
