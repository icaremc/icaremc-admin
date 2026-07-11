-- Doctors Privacy Policy for legal_documents (admin-managed).

insert into public.legal_documents (slug, title, sections, updated_at)
values (
  'doctors-privacy-policy',
  'iCare Doctors Privacy Policy',
  $json$[
    {
      "title": "Privacy Policy",
      "body": "Effective date: June 21, 2026\n\nThis Privacy Policy explains how iCare Doctors (\"we\", \"us\") collects, uses, shares, and protects information when healthcare providers use the iCare Doctors provider application and related services. iCare Doctors is the companion app for doctors and clinicians who offer care through the ICare MC platform."
    },
    {
      "title": "1. Information we collect",
      "body": "Account information: name, email address, phone number, and password (stored securely by our authentication provider).\n\nProfessional profile: medical specialty, medical license number, hospital or clinic affiliation, years of experience, professional biography, consultation services and fees, availability schedule, and profile photo.\n\nVerification documents: images of your medical license and degree or qualification certificates that you upload so administrators can verify your account before approval.\n\nPayout and financial information: bank account holder name, bank name, account number, wallet balance, earnings, and withdrawal/payout requests. We do not store full payment card numbers.\n\nPatient interaction data: appointments booked with you (including patient name and phone number provided for the booking), appointment status, and chat messages between you and patients through the app.\n\nDevice data: push notification token (FCM), device type, and app settings such as theme stored locally.\n\nTechnical data: IP address and standard server logs when you use cloud features (via Supabase and our backend)."
    },
    {
      "title": "2. How we use information",
      "body": "We use your information to:\n• create, verify, and manage your provider account;\n• display your profile, specialty, availability, and fees to patients;\n• enable appointment booking and secure messaging with patients;\n• calculate earnings and process withdrawal/payout requests to your bank account;\n• send notifications about appointments, messages, and account status;\n• review verification documents for account approval;\n• improve app security and performance;\n• comply with legal obligations."
    },
    {
      "title": "3. How we share information",
      "body": "We share information only as needed to operate the Service:\n\nPatients: your professional profile, specialty, availability, consultation fees, and chat messages with patients who book or message you.\n\nAdministrators: your verification documents and profile information are reviewed by ICare MC administrators to approve and manage your account.\n\nService providers: Supabase (database and authentication), Firebase Cloud Messaging (push notifications), Chapa and our payment partners (processing payouts), and hosting providers that process data on our behalf under contractual safeguards.\n\nLegal requirements: when required by law, court order, or to protect rights, safety, and security.\n\nWe do not sell your personal information. We do not use your data for third-party advertising."
    },
    {
      "title": "4. Data storage and security",
      "body": "Account, profile, verification, and financial data are stored in secure cloud infrastructure. Local preferences may be stored on your device. We use industry-standard measures including encryption in transit (HTTPS/TLS) and access controls. No method of transmission or storage is 100% secure."
    },
    {
      "title": "5. Data retention",
      "body": "We retain your information while your account is active and as needed to provide the Service, settle payouts, resolve disputes, and meet legal and financial record-keeping obligations. You may request account deletion by contacting support@icare-mc.com."
    },
    {
      "title": "6. Your choices and rights",
      "body": "You can update your profile, services, availability, and bank details in the app, and manage notification preferences in Settings. Depending on applicable law, you may request access, correction, or deletion of your personal data by emailing support@icare-mc.com. Some financial records may be retained where required by law even after account deletion."
    },
    {
      "title": "7. Patient data responsibilities",
      "body": "When you access patient information through the Service to provide care, you are responsible for handling it confidentially and in accordance with applicable medical privacy and professional obligations. You must not use patient information for any purpose other than delivering care through the platform."
    },
    {
      "title": "8. International transfers",
      "body": "Your data may be processed in countries where our service providers operate. We take steps to ensure appropriate safeguards when data is transferred internationally."
    },
    {
      "title": "9. Changes to this policy",
      "body": "We may update this Privacy Policy. We will post the updated policy on this website and in the app, and revise the effective date. Material changes may be communicated through the app or email where appropriate."
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
