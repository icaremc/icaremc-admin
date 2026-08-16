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
  profiles?: {
    id?: string;
    full_name: string | null;
    phone: string | null;
    account_type?: string | null;
    locale?: Locale | null;
    onboarding_complete?: boolean;
    notifications_enabled?: boolean;
    created_at?: string;
  } | null;
};

export type PregnancyWeek = {
  id: string;
  week_number: number;
  trimester: number;
  image_note: string | null;
  image_url: string | null;
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
  baby: string | null;
  stage: string | null;
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

export type ChildGrowthGrowthData = {
  notes?: string;
  boys?: {
    weight_range?: string;
    length_range?: string;
    head_circumference_range?: string;
    weight_average?: string;
    length_average?: string;
    head_average?: string;
  };
  girls?: {
    weight_range?: string;
    length_range?: string;
    head_circumference_range?: string;
    weight_average?: string;
    length_average?: string;
    head_average?: string;
  };
};

export type ChildGrowthVaccine = {
  name: string;
  route: string;
  benefits: string[];
};

export type ChildGrowthLearningPathItem = {
  label: string;
  explanation?: string;
  /** First image (legacy / convenience). Prefer image_urls when present. */
  image_url?: string;
  image_urls?: string[];
  video_url?: string;
};

export type ChildGrowthMilestoneCategory = {
  title: string;
  items?: (string | ChildGrowthLearningPathItem)[];
};

export type ChildGrowthMetricSex = {
  weight_kg?: number;
  weight_min?: number;
  weight_max?: number;
  height_cm?: number;
  height_min?: number;
  height_max?: number;
  hc_cm?: number;
  hc_min?: number;
  hc_max?: number;
};

export type ChildGrowthMetrics = {
  boys?: ChildGrowthMetricSex;
  girls?: ChildGrowthMetricSex;
};

export type ChildGrowthPeriod = {
  id: string;
  age_months: number;
  age_label: string;
  age_group: string;
  image_note: string | null;
  growth_metrics: ChildGrowthMetrics;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  child_growth_period_translations?: ChildGrowthPeriodTranslation[];
};

export type ChildGrowthPeriodTranslation = {
  id: string;
  period_id: string;
  language_code: Locale;
  title: string;
  subtitle: string | null;
  growth: ChildGrowthGrowthData;
  vaccines: ChildGrowthVaccine[];
  milestones: ChildGrowthMilestoneCategory[];
  red_flags: PregnancyWeekSection[];
  nutrition: PregnancyWeekSection[];
  visit_reminders: PregnancyWeekSection[];
  created_at: string;
  updated_at: string;
};

export type GrowthClinicalMetric =
  | "weight"
  | "height"
  | "head"
  | "bmi"
  | "weight_for_height";

export type GrowthClinicalCondition =
  | "low"
  | "high"
  | "rapid"
  | "falter"
  | "over"
  | "obese";

export type GrowthClinicalAdviceTranslation = {
  id: string;
  advice_id: string;
  language_code: Locale;
  explain_text: string;
  causes: string;
  recommendations: string;
};

export type GrowthClinicalAdvice = {
  id: string;
  code: string;
  metric: GrowthClinicalMetric | string;
  condition: GrowthClinicalCondition | string;
  min_age_months: number;
  max_age_months: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  growth_clinical_advice_translations?: GrowthClinicalAdviceTranslation[];
};

export type FollowupVisitModules = {
  growth?: boolean;
  nutrition?: boolean;
  vaccines?: boolean;
  development?: boolean;
  counseling?: boolean;
  red_flags?: boolean;
};

export type ChildFollowupVisitTemplate = {
  id: string;
  code: string;
  sort_order: number;
  label: string;
  label_translations?: Partial<Record<Locale, string>> | null;
  offset_days: number | null;
  offset_months: number | null;
  growth_period_id: string | null;
  modules: FollowupVisitModules;
  vaccines: ChildGrowthVaccine[];
  remind_days_before: number[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
  child_growth_periods?: Pick<ChildGrowthPeriod, "id" | "age_months" | "age_label"> | null;
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
  gestational_age_weeks: number | null;
  gestational_age_days: number | null;
  birth_hospital: string | null;
  blood_group: string | null;
  woreda: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    id?: string;
    full_name: string | null;
    phone: string | null;
    account_type?: string | null;
    locale?: Locale | null;
    onboarding_complete?: boolean;
    notifications_enabled?: boolean;
    created_at?: string;
  } | null;
};

export type ChildUpdatePayload = {
  name?: string;
  gender?: "male" | "female";
  birth_date?: string;
  birth_weight?: number | null;
  gestational_age_weeks?: number | null;
  gestational_age_days?: number | null;
  birth_hospital?: string | null;
  blood_group?: string | null;
  woreda?: string | null;
};

export type ChildMilestoneCheck = {
  id: string;
  user_id: string;
  child_local_id: string;
  item_key: string;
  created_at: string;
};

export type ChildGrowthMeasurement = {
  id: string;
  user_id: string;
  child_local_id: string;
  measured_on: string;
  age_months: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  head_circumference_cm: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ChildVaccineRecord = {
  id: string;
  user_id: string;
  child_local_id: string;
  vaccine_key: string;
  vaccine_name: string;
  age_months: number | null;
  received: boolean;
  date_received: string | null;
  created_at: string;
  updated_at: string;
};

export type VaccineDoseSchedule = {
  id: string;
  code: string;
  display_name: string;
  dose_number: number;
  series_code: string;
  eligible_from_days: number;
  eligible_until_days: number | null;
  preferred_visit_codes: string[];
  is_published: boolean;
  sort_order: number;
};

/** @deprecated Legacy shape — app uses child_milestone_checks instead. */
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
