import type { SupabaseClient } from "@supabase/supabase-js";
import { storagePathFromPublicUrl } from "@/lib/storage/storageImage";
import { uploadStorageImage } from "@/lib/storage/uploadImage";

export const LEARNING_PATH_IMAGE_BUCKET = "child-growth-learning-paths";

export async function uploadLearningPathImages(
  client: SupabaseClient,
  files: File[],
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    if (!(file instanceof File) || file.size <= 0) continue;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const normalizedExt = ext === "jpeg" ? "jpg" : ext;
    if (!["jpg", "png", "webp"].includes(normalizedExt)) {
      throw new Error("Use JPG, PNG, or WebP images.");
    }

    const path = `${crypto.randomUUID()}.${normalizedExt}`;
    const url = await uploadStorageImage(
      client,
      LEARNING_PATH_IMAGE_BUCKET,
      path,
      file,
      { preset: "photo", upsert: false },
    );
    urls.push(url);
  }

  return urls;
}

export async function removeLearningPathImage(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const storagePath = storagePathFromPublicUrl(imageUrl, LEARNING_PATH_IMAGE_BUCKET);
  if (!storagePath) return;

  await client.storage.from(LEARNING_PATH_IMAGE_BUCKET).remove([storagePath]);
}
