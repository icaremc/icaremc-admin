import type { SupabaseClient } from "@supabase/supabase-js";
import { storagePathFromPublicUrl } from "@/lib/storage/storageImage";
import { uploadStorageImage } from "@/lib/storage/uploadImage";

export function slugifyHospitalName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function nextHospitalSortOrder(client: SupabaseClient): Promise<number> {
  const { data, error } = await client
    .from("hospitals")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.sort_order ?? 0) + 1;
}

const HOSPITAL_IMAGE_BUCKET = "hospitals";

export async function uploadHospitalImage(
  client: SupabaseClient,
  hospitalId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;
  if (!["jpg", "png", "webp"].includes(normalizedExt)) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }

  return uploadStorageImage(
    client,
    HOSPITAL_IMAGE_BUCKET,
    `${hospitalId}/cover.${normalizedExt}`,
    file,
    { preset: "cover" },
  );
}

export async function removeHospitalImage(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const storagePath = storagePathFromPublicUrl(imageUrl, HOSPITAL_IMAGE_BUCKET);
  if (!storagePath) return;

  await client.storage.from(HOSPITAL_IMAGE_BUCKET).remove([storagePath]);
}
