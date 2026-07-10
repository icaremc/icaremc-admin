import { EMPTY_VACCINE, type VaccineFields } from "@/lib/content/formTypes";
import type { ChildGrowthVaccine } from "@/lib/types/database";

export function parseVaccines(raw: unknown): VaccineFields[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ ...EMPTY_VACCINE }];
  }

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const map = item as Record<string, unknown>;
      const benefits = map.benefits;
      const benefitsText = Array.isArray(benefits)
        ? benefits.map((line) => String(line)).join("\n")
        : "";

      if (typeof map.name === "string" || typeof map.route === "string") {
        return {
          name: typeof map.name === "string" ? map.name : "",
          route: typeof map.route === "string" ? map.route : "",
          benefitsText,
        };
      }

      return {
        name: typeof map.title === "string" ? map.title : "",
        route: typeof map.body === "string" ? map.body : "",
        benefitsText,
      };
    });
}

export function serializeVaccines(vaccines: VaccineFields[]): ChildGrowthVaccine[] {
  return vaccines
    .filter(
      (vaccine) =>
        vaccine.name.trim() || vaccine.route.trim() || vaccine.benefitsText.trim(),
    )
    .map((vaccine) => ({
      name: vaccine.name.trim(),
      route: vaccine.route.trim(),
      benefits: vaccine.benefitsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
}
