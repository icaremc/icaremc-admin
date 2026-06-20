export type Hospital = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type HospitalFormInput = {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
};
