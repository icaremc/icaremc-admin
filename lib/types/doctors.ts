export type DoctorCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DoctorAvailabilitySlot = {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DoctorProfile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  specialty: string;
  category_id: string | null;
  hospital: string;
  license_number: string | null;
  experience_years: number;
  availability: string;
  bio: string | null;
  rating: number;
  available_today: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  doctor_availability_slots?: DoctorAvailabilitySlot[];
  doctor_categories?: Pick<DoctorCategory, "id" | "name" | "slug"> | null;
};

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type Appointment = {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  time_slot: string;
  status: AppointmentStatus;
  note: string | null;
  patient_name: string | null;
  patient_phone: string | null;
  created_at: string;
  updated_at: string;
  doctor_profiles?: {
    first_name: string;
    last_name: string;
    specialty: string;
    hospital: string;
  } | null;
  profiles?: {
    full_name: string | null;
    phone: string | null;
  } | null;
};
