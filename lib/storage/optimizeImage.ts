import { createHash } from "crypto";
import sharp from "sharp";
import type { ImagePreset } from "@/lib/storage/storageImage";

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

export function versionedPublicUrl(publicUrl: string, bytes: Buffer): string {
  const version = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
  return `${publicUrl}?v=${version}`;
}
