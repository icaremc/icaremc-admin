import type { SupabaseClient } from "@supabase/supabase-js";

const DOCTOR_PROFILE_BUCKET = "drprofile";
const PROFILE_PHOTO_PATH = "profile.jpg";

export async function uploadDoctorProfilePhoto(
  client: SupabaseClient,
  doctorUserId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;
  if (!["jpg", "png", "webp"].includes(normalizedExt)) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }

  const path = `${doctorUserId}/${PROFILE_PHOTO_PATH}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType =
    normalizedExt === "png"
      ? "image/png"
      : normalizedExt === "webp"
        ? "image/webp"
        : "image/jpeg";

  const { error } = await client.storage.from(DOCTOR_PROFILE_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const publicUrl = client.storage
    .from(DOCTOR_PROFILE_BUCKET)
    .getPublicUrl(path).data.publicUrl;
  return `${publicUrl}?t=${Date.now()}`;
}

export async function removeDoctorProfilePhoto(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const marker = `/${DOCTOR_PROFILE_BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index < 0) return;

  const storagePath = imageUrl
    .substring(index + marker.length)
    .split("?")[0]
    .split("#")[0];
  if (!storagePath) return;

  await client.storage.from(DOCTOR_PROFILE_BUCKET).remove([storagePath]);
}
