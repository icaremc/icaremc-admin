import {
  getBackendApiBaseUrl,
  storagePathFromUploadUrl,
} from "@/lib/backend/config";

function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const row = body as Record<string, unknown>;
  if (typeof row.error === "string" && row.error.trim()) return row.error;
  const detail = row.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return null;
      })
      .filter((part): part is string => Boolean(part));
    if (parts.length > 0) return parts.join("; ");
  }
  return fallback;
}

async function readBackendToken(): Promise<string> {
  const res = await fetch("/api/backend/auth/session", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as {
    token?: string;
    error?: string;
  };
  if (!res.ok || !body.token) {
    throw new Error(body.error ?? "Not signed in to api.icaremchealth.com");
  }
  return body.token;
}

/** Two-step OpenAPI flow: POST /uploads/ then POST /admin/documents DocumentIn. */
export async function uploadAdminDocumentViaBackend(input: {
  title: string;
  category: string;
  file: File;
}): Promise<void> {
  const token = await readBackendToken();
  const base = getBackendApiBaseUrl();

  const uploadForm = new FormData();
  uploadForm.set("file", input.file);
  const uploadRes = await fetch(`${base}/api/v1/uploads/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: uploadForm,
  });
  const uploadBody = (await uploadRes.json().catch(() => null)) as unknown;
  if (!uploadRes.ok) {
    const detail = apiErrorMessage(uploadBody, "Upload failed");
    // ponytail: OpenAPI /uploads/ is image-only today; PDF needs a backend change
    if (/not an image/i.test(detail)) {
      throw new Error(
        `${detail} (POST ${base}/api/v1/uploads/). PDF document upload needs backend support beyond the image uploads API.`,
      );
    }
    throw new Error(`${detail} (POST ${base}/api/v1/uploads/)`);
  }

  const url =
    uploadBody &&
    typeof uploadBody === "object" &&
    typeof (uploadBody as { url?: unknown }).url === "string"
      ? (uploadBody as { url: string }).url
      : "";
  if (!url) {
    throw new Error(`Upload returned no url (POST ${base}/api/v1/uploads/)`);
  }

  const storage_path = storagePathFromUploadUrl(url);
  const createRes = await fetch(`${base}/api/v1/admin/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      category: input.category || "other",
      storage_path,
      file_name: input.file.name || "document.pdf",
      mime_type: input.file.type || "application/pdf",
    }),
  });
  const createBody = (await createRes.json().catch(() => null)) as unknown;
  if (!createRes.ok) {
    throw new Error(
      `${apiErrorMessage(createBody, "Could not create document")} (POST ${base}/api/v1/admin/documents)`,
    );
  }
}
