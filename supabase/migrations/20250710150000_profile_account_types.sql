-- Allowed parent profile types (Mother, Father, Family, Guardian).
-- Existing rows are unchanged; app normalizes legacy values on read.

comment on column public.profiles.account_type is
  'Parent role: Mother, Father, Family, or Guardian.';
