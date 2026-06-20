import type { Appointment } from "@/lib/types/doctors";

export type ChatConversation = {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  last_message: string | null;
  last_message_at: string | null;
  patient_unread_count: number;
  doctor_unread_count: number;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type AppointmentDetailPayload = {
  appointment: Appointment;
  conversation: ChatConversation | null;
  messages: ChatMessage[];
};
