export type Locale = "en" | "am" | "om";

export type AppUserRole = "mother" | "partner";

/** @deprecated Use AppUserRole for mobile profiles. */
export type UserRole = AppUserRole;

export type AdminRole = "super_admin" | "content_admin" | "support" | "viewer";

export type ContentNamespace =
  | "milestone"
  | "daily_tip";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  account_type: string | null;
  locale: Locale | null;
  dark_mode: boolean;
  notifications_enabled: boolean;
  onboarding_complete: boolean;
  role?: AppUserRole;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  admin_role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Mother = {
  id: string;
  user_id: string;
  pregnancy_start_date: string | null;
  due_date: string | null;
  is_first_pregnancy: boolean;
  location: string | null;
  hospital: string | null;
  conditions: string[];
  status: "active" | "delivered";
  delivered_at: string | null;
  child_local_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PregnancyWeek = {
  id: string;
  week_number: number;
  trimester: number;
  image_note: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  pregnancy_week_translations?: PregnancyWeekTranslation[];
};

export type PregnancyWeekTranslation = {
  id: string;
  pregnancy_week_id: string;
  language_code: Locale;
  title: string;
  subtitle: string | null;
  baby_development: string | null;
  mother_changes: string | null;
  recommendations: string | null;
  warning_signs: string | null;
  sections: PregnancyWeekSection[];
  created_at: string;
  updated_at: string;
};

export type PregnancyWeekSection = {
  title: string;
  body?: string;
  bullets?: string[];
  is_urgent?: boolean;
};

export type PregnancyLog = {
  id: string;
  mother_id: string;
  pregnancy_week_id: string | null;
  log_date: string;
  weight: number | null;
  mood: string | null;
  symptoms: string[];
  checklist: Record<string, boolean>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  mothers?: { user_id: string } | null;
  pregnancy_weeks?: { week_number: number } | null;
};

export type ChildProfile = {
  id: string;
  user_id: string;
  birth_date: string;
  sex: "male" | "female";
  created_at: string;
  updated_at: string;
};

export type MilestoneCheck = {
  id: string;
  user_id: string;
  item_key: string;
  checked_at: string;
};

export type Appointment = {
  id: string;
  user_id: string;
  title: string;
  appointment_type: string | null;
  appointment_at: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentTranslation = {
  id: string;
  namespace: ContentNamespace;
  entity_id: string;
  translations: Record<string, Record<string, unknown>>;
  version: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type DailyTipCategory =
  | "nutrition"
  | "exercise"
  | "warning"
  | "emotional"
  | "general";

export type DailyTip = {
  id: string;
  week_number: number;
  category: string | null;
  day_number: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  daily_tip_translations?: DailyTipTranslation[];
};

export type DailyTipTranslation = {
  id: string;
  tip_id: string;
  language_code: Locale;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  profiles: number;
  contentItems: number;
  pregnancyWeeks: number;
  mothers: number;
  pregnancyLogs: number;
  childProfiles: number;
  appointments: number;
  adminUsers: number;
  recentLogs: number;
};
