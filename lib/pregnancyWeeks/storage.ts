import type { SupabaseClient } from "@supabase/supabase-js";
import { storagePathFromPublicUrl } from "@/lib/storage/storageImage";
import { uploadStorageImage } from "@/lib/storage/uploadImage";

const PREGNANCY_WEEK_IMAGE_BUCKET = "pregnancy-weeks";

export function pregnancyWeekHasImage(
  imageUrl: string | null | undefined,
): boolean {
  return Boolean(imageUrl?.trim());
}

export async function uploadPregnancyWeekImage(
  client: SupabaseClient,
  weekId: string,
  weekNumber: number,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;
  if (!["jpg", "png", "webp"].includes(normalizedExt)) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }

  return uploadStorageImage(
    client,
    PREGNANCY_WEEK_IMAGE_BUCKET,
    `${weekId}/week-${weekNumber}.${normalizedExt}`,
    file,
    { preset: "photo" },
  );
}

export async function removePregnancyWeekImage(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const storagePath = storagePathFromPublicUrl(imageUrl, PREGNANCY_WEEK_IMAGE_BUCKET);
  if (!storagePath) return;

  await client.storage.from(PREGNANCY_WEEK_IMAGE_BUCKET).remove([storagePath]);
}
