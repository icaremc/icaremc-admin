export function pregnancyWeekHasImage(
  imageUrl: string | null | undefined,
): boolean {
  return Boolean(imageUrl?.trim());
}
