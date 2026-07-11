-- Full Privacy Policy content for legal_documents.

insert into public.legal_documents (slug, title, sections, updated_at)
values (
  'privacy-policy',
  'Privacy Policy',
  $json$[
    {
      "title": "Privacy Policy",
      "body": "Effective date: June 21, 2026\n\nThis Privacy Policy explains how ICare MC (\"we\", \"us\") collects, uses, shares, and protects information when you use our mobile application, website, and related services."
    },
    {
      "title": "1. Information we collect",
      "body": "Account information: name, email address, phone number, account type (e.g. mother or guardian), and password (stored securely by our authentication provider).\n\nHealth and pregnancy data: due dates, gestational age, pregnancy week logs, symptoms, vitals (weight, blood pressure, temperature), notes, child birth dates, growth records, and optional health history you choose to provide.\n\nProfile and care preferences: city or area, preferred hospital or clinic.\n\nAppointment and payment data: booking details, appointment status, payment references from Chapa (transaction reference, amount paid). We do not store full payment card numbers.\n\nMessages: chat content between you and healthcare providers through the Service.\n\nDevice data: push notification token (FCM), device type, and preferences such as language and theme stored locally.\n\nTechnical data: IP address and standard server logs when you use cloud features (via Supabase and our backend)."
    },
    {
      "title": "2. How we use information",
      "body": "We use your information to:\n• create and manage your account;\n• personalize pregnancy and child health content;\n• save and sync your health logs and appointments;\n• enable messaging and notifications about appointments and care;\n• process online payments for bookings;\n• improve security and performance;\n• comply with legal obligations."
    },
    {
      "title": "3. How we share information",
      "body": "We share information only as needed to operate the Service:\n\nHealthcare providers: appointment and chat information with doctors or clinics you choose to book or message.\n\nService providers: Supabase (database and authentication), Firebase Cloud Messaging (push notifications), Chapa (payment processing), and hosting providers that process data on our behalf under contractual safeguards.\n\nLegal requirements: when required by law, court order, or to protect rights, safety, and security.\n\nWe do not sell your personal information. We do not use your data for third-party advertising."
    },
    {
      "title": "4. Data storage and security",
      "body": "Account and health data are stored in secure cloud infrastructure. Local preferences may be stored on your device. We use industry-standard measures including encryption in transit (HTTPS/TLS) and access controls. No method of transmission or storage is 100% secure."
    },
    {
      "title": "5. Data retention",
      "body": "We retain your information while your account is active and as needed to provide the Service, resolve disputes, and meet legal obligations. You may request account deletion by contacting support@icare-mc.com."
    },
    {
      "title": "6. Your choices and rights",
      "body": "You can update profile information in the Service, manage notification preferences in Settings, and access privacy and terms documents at any time. Depending on applicable law, you may request access, correction, or deletion of your personal data by emailing support@icare-mc.com."
    },
    {
      "title": "7. Children",
      "body": "The Service is intended for parents and guardians. Health information about children is collected only when provided by a parent or guardian."
    },
    {
      "title": "8. International transfers",
      "body": "Your data may be processed in countries where our service providers operate. We take steps to ensure appropriate safeguards when data is transferred internationally."
    },
    {
      "title": "9. Changes to this policy",
      "body": "We may update this Privacy Policy. We will post the updated policy on this website and in the Service, and revise the effective date. Material changes may be communicated through the Service or email where appropriate."
    },
    {
      "title": "10. Contact",
      "body": "Privacy questions or requests: support@icare-mc.com"
    }
  ]$json$::jsonb,
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  sections = excluded.sections,
  updated_at = now();
