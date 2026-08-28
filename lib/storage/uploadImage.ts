import type { SupabaseClient } from "@supabase/supabase-js";
import {
  optimizeImageBytes,
  STORAGE_CACHE_CONTROL,
  versionedPublicUrl,
  webpStoragePath,
  type ImagePreset,
} from "@/lib/storage/storageImage";

interface UploadStorageImageOptions {
  preset?: ImagePreset;
  upsert?: boolean;
  versionQuery?: boolean;
}

export async function uploadStorageImage(
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  options: UploadStorageImageOptions = {},
): Promise<string> {
  const raw = Buffer.from(await file.arrayBuffer());
  const bytes = await optimizeImageBytes(raw, options.preset ?? "photo");
  const storagePath = webpStoragePath(path);

  const { error } = await client.storage.from(bucket).upload(storagePath, bytes, {
    contentType: "image/webp",
    cacheControl: STORAGE_CACHE_CONTROL,
    upsert: options.upsert ?? true,
  });

  if (error) throw new Error(error.message);

  const publicUrl = client.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  return options.versionQuery === false
    ? publicUrl
    : versionedPublicUrl(publicUrl, bytes);
}
