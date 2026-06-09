import type { ContentNamespace } from "./types/database";

export const LOCALES = ["en", "am", "om"] as const;

export const CONTENT_NAMESPACES: {
  value: ContentNamespace;
  label: string;
  description: string;
}[] = [
  {
    value: "milestone",
    label: "Child milestones",
    description: "Developmental milestones by age in months",
  },
  {
    value: "daily_tip",
    label: "Daily tips",
    description: "Health tips grouped by pregnancy week, shown based on the mother's current week",
  },
];

export const CONTENT_SECTIONS = [
  {
    key: "pregnancy_weeks",
    label: "Pregnancy weeks",
    description: "Week-by-week guidance, sections, and translations for the mobile app",
    href: "/admin/pregnancy-weeks",
    addHref: "/admin/pregnancy-weeks/new",
    addLabel: "Add week",
  },
  {
    key: "daily_tips",
    label: "Daily tips",
    description: "One tip per day within each pregnancy week (days 1–7)",
    href: "/admin/content/daily_tip",
    addHref: "/admin/content/daily_tip/new",
    addLabel: "Add tip",
  },
  {
    key: "milestones",
    label: "Child milestones",
    description: "Growth standards and developmental checkpoints by age",
    href: "/admin/content/milestone",
    addHref: "/admin/content/milestone/new",
    addLabel: "Add milestone",
  },
] as const;

export function namespaceLabel(namespace: ContentNamespace): string {
  return (
    CONTENT_NAMESPACES.find((item) => item.value === namespace)?.label ??
    namespace
  );
}

export function namespaceDescription(namespace: ContentNamespace): string {
  return (
    CONTENT_NAMESPACES.find((item) => item.value === namespace)?.description ??
    namespaceLabel(namespace)
  );
}

export function contentEntityIdLabel(namespace: ContentNamespace): string {
  if (namespace === "milestone") return "Age (months)";
  return "Identifier";
}

export const PREGNANCY_WEEK_NUMBERS = Array.from({ length: 42 }, (_, i) => i + 1);

export const PREGNANCY_DAY_NUMBERS = Array.from({ length: 7 }, (_, i) => i + 1);
