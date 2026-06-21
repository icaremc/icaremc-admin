export const ADMIN_ACTIVITY_EVENTS = {
  LOGIN: "admin_login",
  LOGOUT: "admin_logout",
  APPOINTMENT_STATUS: "appointment_status_change",
  ADMIN_CREATED: "admin_created",
  ADMIN_UPDATED: "admin_updated",
  PAYOUT_ACTION: "payout_action",
  PUSH_SENT: "push_sent",
} as const;

export const PLATFORM_ACTIVITY_EVENTS = {
  LOGIN: "login",
  LOGOUT: "logout",
  APPOINTMENT_BOOKED: "appointment_booked",
  APPOINTMENT_CANCELLED: "appointment_cancelled",
  APPOINTMENT_COMPLETED: "appointment_completed",
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_COMPLETED: "payment_completed",
} as const;

export const ACTIVITY_EVENT_LABELS: Record<string, string> = {
  [ADMIN_ACTIVITY_EVENTS.LOGIN]: "Admin logged in",
  [ADMIN_ACTIVITY_EVENTS.LOGOUT]: "Admin logged out",
  [ADMIN_ACTIVITY_EVENTS.APPOINTMENT_STATUS]: "Appointment status changed",
  [ADMIN_ACTIVITY_EVENTS.ADMIN_CREATED]: "Admin account created",
  [ADMIN_ACTIVITY_EVENTS.ADMIN_UPDATED]: "Admin account updated",
  [ADMIN_ACTIVITY_EVENTS.PAYOUT_ACTION]: "Payout action",
  [ADMIN_ACTIVITY_EVENTS.PUSH_SENT]: "Push notification sent",
  [PLATFORM_ACTIVITY_EVENTS.LOGIN]: "Logged in",
  [PLATFORM_ACTIVITY_EVENTS.LOGOUT]: "Logged out",
  [PLATFORM_ACTIVITY_EVENTS.APPOINTMENT_BOOKED]: "Appointment booked",
  [PLATFORM_ACTIVITY_EVENTS.APPOINTMENT_CANCELLED]: "Appointment cancelled",
  [PLATFORM_ACTIVITY_EVENTS.APPOINTMENT_COMPLETED]: "Appointment completed",
  [PLATFORM_ACTIVITY_EVENTS.PAYMENT_INITIATED]: "Payment initiated",
  [PLATFORM_ACTIVITY_EVENTS.PAYMENT_COMPLETED]: "Payment completed",
};
