export type PushDeliveryInput = {
  title: string;
  body: string;
  route?: string;
  type?: "chat" | "booking" | "account";
  tab?: string;
  conversation_id?: string;
};

export function buildFcmData(input: PushDeliveryInput): Record<string, string> {
  const data: Record<string, string> = {
    type: input.type ?? "chat",
    route: input.route?.trim() || "/main",
  };
  if (input.tab?.trim()) data.tab = input.tab.trim();
  if (input.conversation_id?.trim()) {
    data.conversation_id = input.conversation_id.trim();
  }
  return data;
}
