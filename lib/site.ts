const DEFAULT_SITE_URL = "http://localhost:3000";

export const siteConfig = {
  name: "ICare MC",
  shortName: "ICare MC",
  title: "ICare MC — Pregnancy & child care",
  description:
    "Track pregnancy weeks, daily health tips, milestones, and appointments for mothers and caregivers. Available in English, Amharic, and Oromo.",
  adminTitle: "ICare MC Admin",
  adminDescription:
    "Admin portal for managing ICare MC content, users, and health data.",
  locale: "en_US",
  themeColor: "#059669",
} as const;

export function getSiteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    DEFAULT_SITE_URL;

  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return new URL(withProtocol);
}
