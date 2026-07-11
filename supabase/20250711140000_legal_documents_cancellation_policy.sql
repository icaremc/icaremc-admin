-- Legal documents CMS (cancellation policy, terms, privacy) + enable doctor cancel fines.
-- Shared by icare_mc, icare_doctors, icaremc-admin, mc-marketing.
-- Also ensure doctor cancel penalty trigger exists (see doctor_cancel_penalty migration).

create table if not exists public.legal_documents (
  slug text primary key,
  title text not null,
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.legal_documents is
  'Admin-managed legal text shown in MC, DR, and marketing apps';

alter table public.legal_documents enable row level security;

drop policy if exists legal_documents_public_read on public.legal_documents;
create policy legal_documents_public_read
  on public.legal_documents
  for select
  to anon, authenticated
  using (true);

drop policy if exists legal_documents_admin_write on public.legal_documents;
create policy legal_documents_admin_write
  on public.legal_documents
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

insert into public.legal_documents (slug, title, sections, updated_at)
values (
  'cancellation-policy',
  'Appointment cancellation policy',
  $json$[
    {
      "title": "Appointment cancellation policy",
      "body": "Effective date: July 11, 2026\n\nThis policy explains what happens when an appointment is cancelled on iCare MC and iCare Doctors. By booking or accepting appointments, you agree to these rules."
    },
    {
      "title": "1. Doctor availability",
      "body": "Doctors set their own weekly schedule and open time slots. When a patient books and pays for a slot, the doctor is expected to keep that appointment."
    },
    {
      "title": "2. If the doctor cancels",
      "body": "When a doctor cancels a paid appointment:\n• The patient is refunded automatically to their iCare MC wallet (the service fee that was paid).\n• Chapa gateway transaction fees are not refunded.\n• A cancellation penalty may be deducted from the doctor's wallet when enabled by the platform (see Finance settings).\n• The time slot becomes available again for other patients."
    },
    {
      "title": "3. Doctor cancellation fine",
      "body": "Because doctors control their own availability, cancelling a paid booking may result in a fixed fine deducted from the doctor's wallet balance. The fine amount is set by iCare admin. If the doctor's available balance is lower than the fine, only the available balance is deducted."
    },
    {
      "title": "4. If the patient cancels",
      "body": "Patients may cancel while the appointment is still pending. Paid amounts are refunded to the patient wallet (service fee only). Chapa gateway fees are not refunded. No doctor fine applies when the patient cancels."
    },
    {
      "title": "5. Using wallet refunds",
      "body": "Wallet refunds can be used for future doctor bookings on iCare MC. Wallet balance is not a bank payout unless the platform offers a separate withdrawal process."
    },
    {
      "title": "6. Contact",
      "body": "Questions about cancellations or refunds: support@icare-mc.com"
    }
  ]$json$::jsonb,
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  sections = excluded.sections,
  updated_at = now();

insert into public.legal_documents (slug, title, sections, updated_at)
values (
  'terms-of-service',
  'Terms of Service',
  $json$[
    {
      "title": "Terms of Service",
      "body": "Effective date: July 11, 2026\n\nThese Terms govern your use of iCare MC and related services. By creating an account or using the Service, you agree to these Terms."
    },
    {
      "title": "Appointments, payments, and cancellations",
      "body": "Paid appointments require full payment before confirmation. If a doctor cancels a paid booking, the patient is refunded automatically to their app wallet and the doctor may be fined as described in the Appointment cancellation policy. See /cancellation-policy for full details."
    },
    {
      "title": "Not medical advice",
      "body": "iCare MC provides health education and care coordination. It does not replace professional medical advice. In an emergency, call your local emergency number."
    }
  ]$json$::jsonb,
  now()
)
on conflict (slug) do nothing;

insert into public.app_settings (id, data, updated_at)
values (
  'finance',
  jsonb_build_object(
    'minimumAmountWithdraw', 500,
    'platformCommissionPercent', 10,
    'doctorCancelPenaltyEnabled', true,
    'doctorCancelPenaltyAmount', 100
  ),
  now()
)
on conflict (id) do update
set data =
  coalesce(app_settings.data, '{}'::jsonb)
  || jsonb_build_object(
    'doctorCancelPenaltyEnabled',
    coalesce(app_settings.data->>'doctorCancelPenaltyEnabled', 'true')::boolean
      or true,
    'doctorCancelPenaltyAmount',
    coalesce(
      nullif(app_settings.data->>'doctorCancelPenaltyAmount', '')::numeric,
      100
    )
  ),
  updated_at = now();
