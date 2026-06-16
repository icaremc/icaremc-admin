import type { DoctorCategory, DoctorProfile } from "@/lib/types/doctors";

export function doctorDisplayName(first: string, last: string): string {
  return `Dr. ${first} ${last}`.trim();
}

export function doctorCategoryLabel(doctor: DoctorProfile): string {
  return doctor.doctor_categories?.name ?? doctor.specialty ?? "—";
}

export function nextDoctorCategorySortOrder(
  categories: Pick<DoctorCategory, "sort_order">[],
): number {
  if (categories.length === 0) return 1;
  return Math.max(...categories.map((category) => category.sort_order)) + 1;
}

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
