import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const APP_MEMBERSHIP_RECEIPT_BUCKET = "app-membership-receipts";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function uploadAppMembershipReceipt(
  client: SupabaseClient,
  patientId: string,
  file: File,
): Promise<string> {
  const mime = file.type || "application/octet-stream";
  const ext = MIME_EXT[mime];
  if (!ext) {
    throw new Error("Use a JPG, PNG, WebP, or PDF receipt.");
  }

  const path = `${patientId}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage
    .from(APP_MEMBERSHIP_RECEIPT_BUCKET)
    .upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });

  if (error) throw new Error(error.message);

  return path;
}

export async function signedAppMembershipReceiptUrl(
  client: SupabaseClient,
  storagePath: string | null | undefined,
): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  const { data, error } = await client.storage
    .from(APP_MEMBERSHIP_RECEIPT_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
