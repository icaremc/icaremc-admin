import type { SupabaseClient } from "@supabase/supabase-js";
import { storagePathFromPublicUrl } from "@/lib/storage/storageImage";
import { uploadStorageImage } from "@/lib/storage/uploadImage";

const SPECIALITY_IMAGE_BUCKET = "specialities";

export async function uploadSpecialityImage(
  client: SupabaseClient,
  categoryId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;
  if (!["jpg", "png", "webp"].includes(normalizedExt)) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }

  return uploadStorageImage(
    client,
    SPECIALITY_IMAGE_BUCKET,
    `${categoryId}/icon.${normalizedExt}`,
    file,
    { preset: "icon" },
  );
}

export async function removeSpecialityImage(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const storagePath = storagePathFromPublicUrl(imageUrl, SPECIALITY_IMAGE_BUCKET);
  if (!storagePath) return;

  await client.storage.from(SPECIALITY_IMAGE_BUCKET).remove([storagePath]);
}
