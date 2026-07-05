import {
  APP_VERSION_TARGETS,
  type AppVersionTarget,
} from "@/lib/appVersion/appVersionTargets";

export type AppVersionSettingsData = {
  min_version: string;
  force_update: boolean;
  message_en: string;
  message_am: string;
  message_om: string;
};

export function defaultAppVersionSettings(
  app: AppVersionTarget = "mc",
): AppVersionSettingsData {
  const meta = APP_VERSION_TARGETS[app];
  return {
    min_version: "1.0.0",
    force_update: false,
    message_en: meta.defaultMessageEn,
    message_am: meta.defaultMessageAm,
    message_om: meta.defaultMessageOm,
  };
}

/** @deprecated use defaultAppVersionSettings(app) */
export const DEFAULT_APP_VERSION_SETTINGS = defaultAppVersionSettings("mc");

export function parseAppVersionSettingsData(
  raw: unknown,
  app: AppVersionTarget = "mc",
): AppVersionSettingsData {
  const defaults = defaultAppVersionSettings(app);
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const data = raw as Record<string, unknown>;
  return {
    min_version:
      typeof data.min_version === "string"
        ? data.min_version.trim()
        : defaults.min_version,
    force_update: data.force_update === true,
    message_en:
      typeof data.message_en === "string"
        ? data.message_en.trim()
        : defaults.message_en,
    message_am:
      typeof data.message_am === "string"
        ? data.message_am.trim()
        : defaults.message_am,
    message_om:
      typeof data.message_om === "string"
        ? data.message_om.trim()
        : defaults.message_om,
  };
}

export function mergeAppVersionSettings(
  current: AppVersionSettingsData,
  patch: Partial<AppVersionSettingsData>,
): AppVersionSettingsData {
  return {
    min_version: patch.min_version?.trim() || current.min_version,
    force_update: patch.force_update ?? current.force_update,
    message_en: patch.message_en?.trim() || current.message_en,
    message_am: patch.message_am?.trim() || current.message_am,
    message_om: patch.message_om?.trim() || current.message_om,
  };
}
