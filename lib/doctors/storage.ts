import type { SupabaseClient } from "@supabase/supabase-js";
import { storagePathFromPublicUrl } from "@/lib/storage/storageImage";
import { uploadStorageImage } from "@/lib/storage/uploadImage";

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

  return uploadStorageImage(
    client,
    DOCTOR_PROFILE_BUCKET,
    `${doctorUserId}/${PROFILE_PHOTO_PATH}`,
    file,
    { preset: "photo" },
  );
}

export async function removeDoctorProfilePhoto(
  client: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl?.trim()) return;

  const storagePath = storagePathFromPublicUrl(imageUrl, DOCTOR_PROFILE_BUCKET);
  if (!storagePath) return;

  await client.storage.from(DOCTOR_PROFILE_BUCKET).remove([storagePath]);
}
