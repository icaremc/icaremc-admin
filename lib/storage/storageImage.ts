import { createHash } from "crypto";
import sharp from "sharp";

export const STORAGE_CACHE_CONTROL = "31536000";

export type ImagePreset = "icon" | "photo" | "cover";

const MAX_WIDTH: Record<ImagePreset, number> = {
  icon: 512,
  photo: 800,
  cover: 1200,
};

export async function optimizeImageBytes(
  input: Buffer,
  preset: ImagePreset = "photo",
): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH[preset], withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

export function webpStoragePath(path: string): string {
  return path.replace(/\.[^.]+$/, ".webp");
}

export function imageContentType(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function versionedPublicUrl(publicUrl: string, bytes: Buffer): string {
  const version = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
  return `${publicUrl}?v=${version}`;
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
