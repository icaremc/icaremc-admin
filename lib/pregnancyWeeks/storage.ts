import type { SupabaseClient } from "@supabase/supabase-js";

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

  const path = `${weekId}/week-${weekNumber}.${normalizedExt}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType =
    normalizedExt === "png"
      ? "image/png"
      : normalizedExt === "webp"
        ? "image/webp"
        : "image/jpeg";

  const { error } = await client.storage
    .from(PREGNANCY_WEEK_IMAGE_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  return client.storage
    .from(PREGNANCY_WEEK_IMAGE_BUCKET)
    .getPublicUrl(path).data.publicUrl;
}

export async function removePregnancyWeekImage(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const marker = `/${PREGNANCY_WEEK_IMAGE_BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index < 0) return;

  const storagePath = imageUrl.substring(index + marker.length);
  await client.storage.from(PREGNANCY_WEEK_IMAGE_BUCKET).remove([storagePath]);
}
