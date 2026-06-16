import type { SupabaseClient } from "@supabase/supabase-js";
import { fcmErrorMessage, isStaleFcmTokenError, sendFcmMessage } from "@/lib/firebase/fcm";
import { buildFcmData, type PushDeliveryInput } from "@/lib/push/pushDelivery";

export type DoctorPushProfile = {
  fcm_token: string | null;
  notifications_enabled: boolean | null;
  first_name: string | null;
  last_name: string | null;
};

export type { PushDeliveryInput };

export function doctorPushReadiness(profile: DoctorPushProfile) {
  if (!profile.fcm_token) {
    return {
      canSend: false,
      reason:
        "No FCM token on this doctor profile. Ask the doctor to open the app while signed in and allow notifications.",
    } as const;
  }

  if (profile.notifications_enabled === false) {
    return {
      canSend: false,
      reason: "Notifications are disabled in the doctor app settings.",
    } as const;
  }

  return { canSend: true, reason: null } as const;
}

export async function fetchDoctorPushProfile(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<{ profile: DoctorPushProfile | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("doctor_profiles")
    .select("fcm_token, notifications_enabled, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { profile: null, error: error.message };
  if (!data) return { profile: null, error: "Doctor not found" };

  return { profile: data as DoctorPushProfile, error: null };
}

async function clearStaleDoctorFcmToken(
  serviceClient: SupabaseClient,
  userId: string,
) {
  await serviceClient
    .from("doctor_profiles")
    .update({ fcm_token: null, updated_at: new Date().toISOString() })
    .eq("id", userId);
}

export function doctorApprovalPushMessage(firstName: string): PushDeliveryInput {
  const name = firstName.trim() || "Doctor";
  return {
    title: "Account approved",
    body: `Dear ${name}, your ICare Doctors account has been approved. You can now receive patients on ICare MC.`,
    route: "/main",
    type: "account",
  };
}

export async function sendDoctorPush({
  serviceClient,
  userId,
  input,
}: {
  serviceClient: SupabaseClient;
  userId: string;
  input: PushDeliveryInput;
}) {
  const { profile, error } = await fetchDoctorPushProfile(serviceClient, userId);
  if (error) return { ok: false as const, error, clearedToken: false };

  const readiness = doctorPushReadiness(profile ?? { fcm_token: null, notifications_enabled: null, first_name: null, last_name: null });
  if (!readiness.canSend) {
    return { ok: true as const, skipped: readiness.reason };
  }

  try {
    const messageId = await sendFcmMessage({
      token: profile!.fcm_token!,
      title: input.title,
      body: input.body,
      data: buildFcmData(input),
    });

    return { ok: true as const, messageId };
  } catch (pushError) {
    if (isStaleFcmTokenError(pushError)) {
      await clearStaleDoctorFcmToken(serviceClient, userId);
      return {
        ok: false as const,
        error:
          "The doctor device token is no longer valid and was cleared. Ask them to open the app again.",
        clearedToken: true,
      };
    }

    return {
      ok: false as const,
      error: fcmErrorMessage(pushError),
      clearedToken: false,
    };
  }
}
