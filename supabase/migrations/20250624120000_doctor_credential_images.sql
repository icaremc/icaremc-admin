-- Doctor license & degree images on doctor_profiles (uploaded from ICare Doctors app)
alter table public.doctor_profiles
  add column if not exists license_image_url text;

alter table public.doctor_profiles
  add column if not exists degree_image_url text;
