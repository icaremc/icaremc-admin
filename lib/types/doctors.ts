export type DoctorCategory = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
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

export type DoctorService = {
  id: string;
  doctor_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
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
  license_image_url: string | null;
  degree_image_url: string | null;
  experience_years: number;
  availability: string;
  bio: string | null;
  rating: number;
  available_today: boolean;
  is_verified: boolean;
  profile_photo_url: string | null;
  currency: string;
  prepayment_mode: "none" | "percent" | "full";
  prepayment_percent: number;
  created_at: string;
  updated_at: string;
  doctor_availability_slots?: DoctorAvailabilitySlot[];
  doctor_services?: DoctorService[];
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
  service_id: string | null;
  service_name: string | null;
  service_description: string | null;
  service_price: number | null;
  currency: string;
  prepayment_mode: "none" | "percent" | "full";
  prepayment_percent: number | null;
  total_amount: number;
  prepayment_amount: number;
  amount_paid: number;
  payment_status: "unpaid" | "partial" | "paid" | "waived";
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
