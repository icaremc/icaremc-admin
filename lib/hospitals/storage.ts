import type { SupabaseClient } from "@supabase/supabase-js";

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

  const path = `${hospitalId}/cover.${normalizedExt}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType =
    normalizedExt === "png"
      ? "image/png"
      : normalizedExt === "webp"
        ? "image/webp"
        : "image/jpeg";

  const { error } = await client.storage.from(HOSPITAL_IMAGE_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  return client.storage.from(HOSPITAL_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function removeHospitalImage(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const marker = `/${HOSPITAL_IMAGE_BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index < 0) return;

  const storagePath = imageUrl.substring(index + marker.length);
  await client.storage.from(HOSPITAL_IMAGE_BUCKET).remove([storagePath]);
}
