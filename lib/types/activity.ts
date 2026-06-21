export type ActivityActorType = "mother" | "doctor" | "admin" | "anonymous";

export type AdminActivityLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  event_type: string;
  event_label: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type PlatformActivityLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_type: ActivityActorType;
  event_type: string;
  event_label: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type CombinedActivityLog = {
  id: string;
  source: "admin" | "platform";
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  actor_type: ActivityActorType | "admin" | null;
  event_type: string;
  event_label: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
