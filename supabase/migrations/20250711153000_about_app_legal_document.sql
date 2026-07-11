-- Seed About app content into legal_documents (admin-managed).
-- Shown in MC Settings → About.

insert into public.legal_documents (slug, title, sections, updated_at)
values (
  'about-app',
  'About iCare MC',
  $json$[
    {
      "title": "About",
      "body": "An app that helps mothers understand the care they should give themselves and their children."
    },
    {
      "title": "Mission",
      "body": "Share clear health information with mothers, fathers, and caregivers, supporting safety at every stage and helping spot concerns early."
    },
    {
      "title": "Vision",
      "body": "A trusted maternal and child health app in Ethiopia and beyond, for growth monitoring, counseling, and early awareness."
    },
    {
      "title": "Disclaimer",
      "body": "Educational resources only. This does not replace professional medical advice. Always consult a qualified healthcare provider."
    }
  ]$json$::jsonb,
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  sections = excluded.sections,
  updated_at = now();
