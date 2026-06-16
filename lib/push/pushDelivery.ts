export type PushDeliveryInput = {
  title: string;
  body: string;
  route?: string;
  type?: "chat" | "booking" | "account";
  tab?: string;
};

export function buildFcmData(input: PushDeliveryInput): Record<string, string> {
  const data: Record<string, string> = {
    type: input.type ?? "chat",
    route: input.route?.trim() || "/main",
  };
  if (input.tab?.trim()) data.tab = input.tab.trim();
  return data;
}
