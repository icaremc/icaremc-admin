import type { SupabaseClient } from "@supabase/supabase-js";

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

    const contentType =
      normalizedExt === "png"
        ? "image/png"
        : normalizedExt === "webp"
          ? "image/webp"
          : "image/jpeg";

    const path = `${crypto.randomUUID()}.${normalizedExt}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await client.storage
      .from(LEARNING_PATH_IMAGE_BUCKET)
      .upload(path, bytes, {
        contentType,
        upsert: false,
      });

    if (error) throw new Error(error.message);

    urls.push(
      client.storage.from(LEARNING_PATH_IMAGE_BUCKET).getPublicUrl(path).data
        .publicUrl,
    );
  }

  return urls;
}

export async function removeLearningPathImage(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const marker = `/${LEARNING_PATH_IMAGE_BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index < 0) return;

  const storagePath = imageUrl.substring(index + marker.length);
  await client.storage.from(LEARNING_PATH_IMAGE_BUCKET).remove([storagePath]);
}
