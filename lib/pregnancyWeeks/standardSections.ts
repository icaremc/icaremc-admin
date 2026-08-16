import type { Locale } from "@/lib/types/database";
import {
  EMPTY_PREGNANCY_SECTION,
  type PregnancySectionFields,
} from "@/lib/content/formTypes";

export const BABY_DEVELOPMENT_SECTION_TITLE: Record<Locale, string> = {
  en: "Baby's Development",
  am: "የሕፃን እድገት",
  om: "Guddina Daa'imaa",
};

export const PREGNANCY_CHANGES_SECTION_TITLE: Record<Locale, string> = {
  en: "Pregnancy changes",
  am: "የእርግዝና ለውጦች",
  om: "Jijjiirama Ulfaa",
};

export function standardPregnancySections(
  locale: Locale,
): PregnancySectionFields[] {
  return [
    {
      ...EMPTY_PREGNANCY_SECTION,
      title: BABY_DEVELOPMENT_SECTION_TITLE[locale],
    },
    {
      ...EMPTY_PREGNANCY_SECTION,
      title: PREGNANCY_CHANGES_SECTION_TITLE[locale],
    },
  ];
}

/** Ensure Baby's Development + Pregnancy changes are the first two sections. */
export function ensureStandardPregnancySections(
  locale: Locale,
  sections: PregnancySectionFields[],
): PregnancySectionFields[] {
  const [babyTitle, pregTitle] = [
    BABY_DEVELOPMENT_SECTION_TITLE[locale],
    PREGNANCY_CHANGES_SECTION_TITLE[locale],
  ];
  const rest = [...sections];

  let baby = rest.find((section) => section.title.trim() === babyTitle);
  let preg = rest.find((section) => section.title.trim() === pregTitle);

  if (baby) {
    rest.splice(
      rest.findIndex((section) => section.title.trim() === babyTitle),
      1,
    );
  } else {
    baby = { ...EMPTY_PREGNANCY_SECTION, title: babyTitle };
  }

  if (preg) {
    rest.splice(
      rest.findIndex((section) => section.title.trim() === pregTitle),
      1,
    );
  } else {
    preg = { ...EMPTY_PREGNANCY_SECTION, title: pregTitle };
  }

  return [baby, preg, ...rest];
}
