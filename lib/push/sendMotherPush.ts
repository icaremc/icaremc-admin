import type { SupabaseClient } from "@supabase/supabase-js";
import { fcmErrorMessage, isStaleFcmTokenError, sendFcmMessage } from "@/lib/firebase/fcm";
import { buildFcmData, type PushDeliveryInput } from "@/lib/push/pushDelivery";

export type MotherPushProfile = {
  fcm_token: string | null;
  notifications_enabled: boolean | null;
  full_name: string | null;
  role: string | null;
};

export type { PushDeliveryInput };

export function pushReadiness(profile: MotherPushProfile) {
  if (profile.role && profile.role !== "mother") {
    return {
      canSend: false,
      reason: "Push is only available for mother accounts.",
    } as const;
  }

  if (!profile.fcm_token) {
    return {
      canSend: false,
      reason:
        "No FCM token on this profile. Ask the user to open the mobile app while signed in and allow notifications.",
    } as const;
  }

  if (profile.notifications_enabled === false) {
    return {
      canSend: false,
      reason: "Notifications are disabled in the mobile app settings.",
    } as const;
  }

  return { canSend: true, reason: null } as const;
}

export async function fetchMotherPushProfile(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<{ profile: MotherPushProfile | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("fcm_token, notifications_enabled, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { profile: null, error: error.message };
  if (!data) return { profile: null, error: "User not found" };

  return { profile: data as MotherPushProfile, error: null };
}

async function clearStaleFcmToken(
  serviceClient: SupabaseClient,
  userId: string,
) {
  await serviceClient
    .from("profiles")
    .update({ fcm_token: null, updated_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function sendMotherPush({
  serviceClient,
  userId,
  token,
  input,
}: {
  serviceClient: SupabaseClient;
  userId: string;
  token: string;
  input: PushDeliveryInput;
}) {
  try {
    const messageId = await sendFcmMessage({
      token,
      title: input.title,
      body: input.body,
      data: buildFcmData(input),
    });

    return { ok: true as const, messageId };
  } catch (error) {
    if (isStaleFcmTokenError(error)) {
      await clearStaleFcmToken(serviceClient, userId);
      return {
        ok: false as const,
        error:
          "The device token is no longer valid and was cleared from the profile. Ask the user to open the app again.",
        clearedToken: true,
      };
    }

    const message = fcmErrorMessage(error);
    return { ok: false as const, error: message, clearedToken: false };
  }
}
