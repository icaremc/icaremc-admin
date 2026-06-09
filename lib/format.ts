export const EMPTY_DISPLAY = "-";

export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY_DISPLAY;
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY_DISPLAY;
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(value: string, max = 80): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}
