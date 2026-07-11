-- Full Terms of Service content for legal_documents (replaces stub).

insert into public.legal_documents (slug, title, sections, updated_at)
values (
  'terms-of-service',
  'Terms of Service',
  $json$[
    {
      "title": "Terms of Service",
      "body": "Effective date: June 21, 2026\n\nThese Terms of Service (\"Terms\") govern your use of the ICare MC mobile application, website, and related services (\"Service\") operated by iCare MC (\"we\", \"us\", or \"our\"). By creating an account or using the Service, you agree to these Terms."
    },
    {
      "title": "1. Eligibility",
      "body": "You must be at least 18 years old to create an account. If you use the Service on behalf of a child, you represent that you are the parent or legal guardian and consent to the collection of health-related information about that child as described in our Privacy Policy."
    },
    {
      "title": "2. Nature of the Service",
      "body": "ICare MC provides maternal and child health education, pregnancy tracking tools, growth milestones, appointment booking, secure messaging with healthcare providers, and optional online payments for medical services. The Service is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with questions about a medical condition."
    },
    {
      "title": "3. Accounts",
      "body": "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You agree to provide accurate registration information and to update it when it changes. We may suspend or terminate accounts that violate these Terms or applicable law."
    },
    {
      "title": "4. Health information you provide",
      "body": "You may enter pregnancy dates, health logs, child growth data, and related notes. You are responsible for the accuracy of information you submit. Healthcare providers you interact with through the Service may rely on information you provide when offering care."
    },
    {
      "title": "5. Appointments and payments",
      "body": "Appointment availability, pricing, and clinical services are provided by independent healthcare facilities and professionals. Online payments processed through Chapa or other payment partners are subject to their terms as well. We are not responsible for care delivered at a clinic or hospital outside the Service."
    },
    {
      "title": "6. Acceptable use",
      "body": "You agree not to misuse the Service, including by: attempting unauthorized access; uploading harmful or illegal content; harassing providers or other users; reverse engineering the Service; or using the Service in a way that could harm others or overload our systems."
    },
    {
      "title": "7. Intellectual property",
      "body": "The Service, including text, graphics, logos, and software, is owned by us or our licensors and protected by applicable intellectual property laws. You receive a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes."
    },
    {
      "title": "8. Disclaimer of warranties",
      "body": "THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT HEALTH CONTENT IS COMPLETE OR CURRENT."
    },
    {
      "title": "9. Limitation of liability",
      "body": "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR RELIANCE ON HEALTH INFORMATION IN THE SERVICE."
    },
    {
      "title": "10. Termination",
      "body": "You may stop using the Service at any time. We may suspend or terminate access if you breach these Terms or if required by law. Provisions that by their nature should survive termination will remain in effect."
    },
    {
      "title": "11. Changes",
      "body": "We may update these Terms from time to time. We will post the revised Terms on this website and in the Service and update the effective date. Continued use after changes constitutes acceptance of the updated Terms."
    },
    {
      "title": "12. Governing law",
      "body": "These Terms are governed by the laws of the Federal Democratic Republic of Ethiopia, without regard to conflict-of-law principles, except where mandatory consumer protections in your country apply."
    },
    {
      "title": "13. Contact",
      "body": "Questions about these Terms: support@icare-mc.com"
    }
  ]$json$::jsonb,
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  sections = excluded.sections,
  updated_at = now();
