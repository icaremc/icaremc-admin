import type { Child } from "@/lib/types/database";

export function childAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function childAgeLabel(birthDate: string): string {
  const months = childAgeInMonths(birthDate);
  if (months < 1) return "Under 1 month";
  if (months === 1) return "1 month";
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return years === 1 ? "1 year" : `${years} years`;
  return `${years}y ${rem}m`;
}

export function childDisplayName(child: Child): string {
  if (child.name.trim()) return child.name.trim();
  return child.gender === "female" ? "Baby girl" : "Baby boy";
}

export function childMatchesSearch(child: Child, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const fields = [
    child.name,
    child.gender,
    child.delivery_type,
    child.local_id,
    child.profiles?.full_name,
    child.profiles?.phone,
    child.user_id,
    child.pregnancy_id,
    `week ${childAgeInMonths(child.birth_date)}`,
  ];

  return fields
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export function formatMilestoneType(type: string): string {
  const parts = type.split("-");
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    const [month, category, item] = parts.map(Number);
    return `Month ${month} · #${category + 1}-${item + 1}`;
  }
  return type;
}
