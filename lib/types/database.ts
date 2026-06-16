export type Locale = "en" | "am" | "om";

export type AppUserRole = "mother" | "partner";

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
  fcm_token: string | null;
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

export type PregnancyStatus =
  | "active"
  | "completed"
  | "miscarriage"
  | "terminated";

export type Pregnancy = {
  id: string;
  user_id: string;
  lmp_date: string | null;
  edd: string | null;
  status: PregnancyStatus;
  pregnancy_number: number;
  is_first_pregnancy: boolean;
  location: string | null;
  hospital: string | null;
  conditions: string[];
  created_at: string;
  completed_at: string | null;
  updated_at: string;
  profiles?: { full_name: string | null; phone: string | null } | null;
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
  pregnancy_id: string;
  week_number: number;
  weight: number | null;
  height: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature: number | null;
  symptoms: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  pregnancies?: { user_id: string; profiles?: { full_name: string | null } | null } | null;
};

export type Child = {
  id: string;
  user_id: string;
  pregnancy_id: string | null;
  local_id: string | null;
  name: string;
  gender: "male" | "female";
  birth_date: string;
  birth_weight: number | null;
  birth_height: number | null;
  delivery_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; phone: string | null } | null;
};

export type ChildMilestone = {
  id: string;
  child_id: string;
  milestone_type: string;
  achieved_date: string | null;
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
  pregnancies: number;
  pregnancyLogs: number;
  children: number;
  adminUsers: number;
  recentLogs: number;
  appointments: number;
  pendingAppointments: number;
  doctors: number;
};
