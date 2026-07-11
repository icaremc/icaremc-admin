-- Full Medical disclaimer content for legal_documents.

insert into public.legal_documents (slug, title, sections, updated_at)
values (
  'medical-disclaimer',
  'Medical disclaimer',
  $json$[
    {
      "title": "Medical disclaimer",
      "body": "ICare MC is an educational and care-coordination tool. Content about pregnancy, child development, and general health is for informational purposes only."
    },
    {
      "title": "Not medical advice",
      "body": "Nothing in the Service constitutes medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical questions, emergencies, or before making health decisions for yourself or your child."
    },
    {
      "title": "Emergency",
      "body": "If you think you or your child may have a medical emergency, call your local emergency number immediately. In Ethiopia, ambulance service is available at 907."
    },
    {
      "title": "Provider relationship",
      "body": "Doctors and clinics listed in the Service are independent professionals and facilities. ICare MC does not guarantee outcomes of medical care received through appointments booked in the Service."
    }
  ]$json$::jsonb,
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  sections = excluded.sections,
  updated_at = now();
