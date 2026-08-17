import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFcmData, type PushDeliveryInput } from "@/lib/push/pushDelivery";

export async function saveNotification(
  serviceClient: SupabaseClient,
  userId: string,
  input: PushDeliveryInput,
  fcmMessageId?: string,
) {
  const data: Record<string, string> = {
    ...buildFcmData(input),
    ...(fcmMessageId ? { fcm_message_id: fcmMessageId } : {}),
  };

  const { error } = await serviceClient.from("notifications").insert({
    user_id: userId,
    type: input.type ?? "chat",
    title: input.title,
    body: input.body,
    data,
  });

  if (error) {
    console.error("[notifications] insert failed:", error.message);
  }
}
