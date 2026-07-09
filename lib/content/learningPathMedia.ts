import type { LearningPathItemFields } from "@/lib/content/formTypes";

/** Collect unique image URLs from legacy `image_url` and `image_urls`. */
export function collectLearningPathImageUrls(
  item: Pick<LearningPathItemFields, "image_url" | "image_urls"> | {
    image_url?: string;
    image_urls?: string[];
    imageUrl?: string;
    imageUrls?: string[];
  },
): string[] {
  const urls: string[] = [];
  const push = (value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed || urls.includes(trimmed)) return;
    urls.push(trimmed);
  };

  if ("image_urls" in item && Array.isArray(item.image_urls)) {
    for (const url of item.image_urls) push(url);
  }
  if ("imageUrls" in item && Array.isArray(item.imageUrls)) {
    for (const url of item.imageUrls) push(url);
  }
  if ("image_url" in item) push(item.image_url);
  if ("imageUrl" in item) push(item.imageUrl);

  return urls;
}

export function learningPathItemHasContent(
  item: Pick<LearningPathItemFields, "label" | "image_url" | "image_urls" | "video_url">,
): boolean {
  return Boolean(
    item.label.trim() ||
      collectLearningPathImageUrls(item).length > 0 ||
      item.video_url.trim(),
  );
}

export function serializeLearningPathItemMedia(
  item: LearningPathItemFields,
): { image_url?: string; image_urls?: string[]; video_url?: string } {
  const images = collectLearningPathImageUrls(item);
  const video = item.video_url.trim();
  // One media type only: images win if both were somehow set.
  if (images.length > 0) {
    return {
      image_url: images[0],
      image_urls: images,
    };
  }
  if (video) {
    return { video_url: video };
  }
  return {};
}
