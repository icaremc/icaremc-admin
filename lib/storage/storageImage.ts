export const STORAGE_CACHE_CONTROL = "31536000";

export type ImagePreset = "icon" | "photo" | "cover";

export function webpStoragePath(path: string): string {
  return path.replace(/\.[^.]+$/, ".webp");
}

export function imageContentType(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function storagePathFromPublicUrl(
  imageUrl: string,
  bucket: string,
): string | null {
  const marker = `/${bucket}/`;
  const index = imageUrl.indexOf(marker);
  if (index < 0) return null;

  return imageUrl
    .substring(index + marker.length)
    .split("?")[0]
    .split("#")[0];
}
