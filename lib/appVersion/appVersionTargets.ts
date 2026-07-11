export const APP_VERSION_TARGETS = {
  mc: {
    rowId: "app_version",
    label: "iCare MC",
    description: "Patient client",
    versionHint: "Match icare_mc pubspec.yaml version when you release.",
    supportsLocalizedMessages: true,
    defaultMessageEn:
      "A new version of iCare MC is available with important updates. Please update to continue.",
    defaultMessageAm:
      "አዲስ የ iCare MC ስሪት ከአስፈላጊ ማሻሻያዎች ጋር ይገኛል። ለመቀጠል እባክዎ ያዘምኑ።",
    defaultMessageOm:
      "Gosa haaraa iCare MC fooyya'iinsa barbaachisaa wajjin ni argama. Itti fufuuf haaromsi.",
  },
  doctors: {
    rowId: "app_version_doctors",
    label: "iCare Doctors",
    description: "Provider client",
    versionHint: "Match icare_doctors pubspec.yaml version when you release.",
    supportsLocalizedMessages: false,
    defaultMessageEn:
      "A new version of iCare Doctors is available with important updates. Please update to continue.",
    defaultMessageAm: "",
    defaultMessageOm: "",
  },
} as const;

export type AppVersionTarget = keyof typeof APP_VERSION_TARGETS;

export const APP_VERSION_TARGET_LIST = Object.entries(APP_VERSION_TARGETS).map(
  ([id, meta]) => ({
    id: id as AppVersionTarget,
    ...meta,
  }),
);

export function isAppVersionTarget(value: string | null): value is AppVersionTarget {
  return value === "mc" || value === "doctors";
}

export function resolveAppVersionTarget(value: string | null): AppVersionTarget {
  return isAppVersionTarget(value) ? value : "mc";
}

export function rowIdForAppVersionTarget(app: AppVersionTarget): string {
  return APP_VERSION_TARGETS[app].rowId;
}
