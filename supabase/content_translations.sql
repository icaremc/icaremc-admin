-- ICARE-MC — Content translations (JSONB, multi-language)
-- Run in Supabase Dashboard → SQL Editor after schema.sql
--
-- UI strings stay in the Flutter app (app_en / app_am / app_om).
-- This table is for editable content only: weeks, milestones, tips, etc.

-- ---------------------------------------------------------------------------
-- Extend profiles.locale to include Afan Oromo (if not already)
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_locale_check;

alter table public.profiles
  add constraint profiles_locale_check
  check (locale in ('en', 'am', 'om'));

-- ---------------------------------------------------------------------------
-- Content translations
-- ---------------------------------------------------------------------------
create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),

  -- Content group: pregnancy_week | milestone | daily_tip | calculator_edu | about | emergency
  namespace text not null,

  -- Stable id within namespace: '7', '2', 'edd_lnmp', 'tip_01', 'about'
  entity_id text not null,

  -- { "en": { ... }, "am": { ... }, "om": { ... } }
  translations jsonb not null default '{}'::jsonb,

  -- Optional: bump when editors publish changes (app can compare for cache refresh)
  version int not null default 1,

  is_published boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (namespace, entity_id),

  constraint content_translations_namespace_check check (
    namespace in (
      'pregnancy_week',
      'milestone',
      'daily_tip',
      'calculator_edu',
      'about',
      'emergency'
    )
  ),

  -- At least English must exist; each locale value must be a JSON object or string
  constraint content_translations_has_en check (
    translations ? 'en'
  )
);

comment on table public.content_translations is
  'Localized app content (not UI chrome). translations JSONB keys: en, am, om.';

comment on column public.content_translations.namespace is
  'Content type: pregnancy_week, milestone, daily_tip, calculator_edu, about, emergency';

comment on column public.content_translations.entity_id is
  'Id within namespace, e.g. week "7", milestone age "2", daily_tip UUID (+ week_number in en JSON), calculator_edu UUID + topic_key';

comment on column public.content_translations.translations is
  'Per-locale payload. Structure depends on namespace (see README).';

create index if not exists content_translations_namespace_idx
  on public.content_translations (namespace);

create index if not exists content_translations_published_idx
  on public.content_translations (namespace, entity_id)
  where is_published = true;

create index if not exists content_translations_translations_gin
  on public.content_translations using gin (translations);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
drop trigger if exists content_translations_updated_at on public.content_translations;
create trigger content_translations_updated_at
  before update on public.content_translations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper: fetch one locale slice (optional, for SQL testing)
-- ---------------------------------------------------------------------------
create or replace function public.get_content_translation(
  p_namespace text,
  p_entity_id text,
  p_locale text default 'en'
)
returns jsonb
language sql
stable
as $$
  select translations -> p_locale
  from public.content_translations
  where namespace = p_namespace
    and entity_id = p_entity_id
    and is_published = true
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Content is global (same for all users): read for everyone; write for admins only.
-- ---------------------------------------------------------------------------
alter table public.content_translations enable row level security;

-- Anyone with the anon/authenticated key can read published content (offline cache on app launch)
drop policy if exists "content_translations_select_published" on public.content_translations;
create policy "content_translations_select_published" on public.content_translations
  for select
  using (is_published = true);

-- Inserts/updates/deletes: use service_role in dashboard, or add admin role later.
-- No insert/update/delete policies for authenticated users = blocked by default (good).

-- ---------------------------------------------------------------------------
-- Example seed rows (edit or delete after importing real content)
-- ---------------------------------------------------------------------------

-- Calculator education — EDD from LNMP (UUID row + topic_key for app lookup)
insert into public.content_translations (namespace, entity_id, translations)
values (
  'calculator_edu',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  $json${
    "en": {
      "topic_key": "edd_lnmp",
      "title": "EDD from last normal menstrual period",
      "formula": "EDD = LNMP + 9 months + 7 days",
      "description": "If you have regular monthly menstrual periods, enter the first day of your last period.",
      "example": "Example: LNMP = July 10, 2025 → +9 months = April 10, 2026 → +7 days = April 17, 2026 (EDD)"
    },
    "am": {
      "title": "ካለፈው መደበኛ የወር አበባ — የመውለድ ቀን",
      "formula": "የመውለድ ቀን = LNMP + 9 ወር + 7 ቀን",
      "description": "በየወሩ የወር አበባ የሚያዩ ከሆነ፣ የመጨረሻ ያዩበትን የወር አበባ ቀን ያስገቡ።",
      "example": "LNMP = July 10, 2025 + 9 ወር = April 10, 2026 + 7 ቀን = April 17, 2026"
    },
    "om": {
      "title": "Guyyaa dhalootii ulfaa kan yeroo dhiibbaa dhiiraa dhumaa irratti hundaa'e",
      "formula": "Guyyaa Ulfa Dhaluutti Eeggamu = Yeroo dhiibbaa dhiiraa dhumaa kan sirrii ta'e + 9 Ji'oota + Guyyaa Torba",
      "description": "Yoo dhiibbaa dhiigaa ji'aan sirrii qabaatte, guyyaa dhumaa itti argite galchi.",
      "example": "Fakkeenya: LNMP = July 10, 2025 + 9 ji'a = April 10, 2026 + 7 guyyaa = April 17, 2026"
    }
  }$json$::jsonb
)
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();

-- Daily tip example (UUID entity_id + week_number for week-based pools)
insert into public.content_translations (namespace, entity_id, translations)
values (
  'daily_tip',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  $json${
    "en": { "week_number": 1, "text": "Drink plenty of water today — hydration supports you and your baby." },
    "am": { "text": "ዛሬ ብዙ ውሃ ይጠጡ — ለእርስዎ እና ለሕፃንዎ ይረዳል።" },
    "om": { "text": "Har'a bishaan baay'ee dhugaa — kunuunsa keef fi daa'ima keetiif gargaara." }
  }$json$::jsonb
)
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();

-- About — mission (single field per row or one row with multiple keys)
insert into public.content_translations (namespace, entity_id, translations)
values (
  'about',
  'mission',
  '{
    "en": { "body": "Share clear health information with mothers, fathers, and caregivers—supporting safety at every stage and helping spot concerns early." },
    "am": { "body": "ለእናቶች፣ ለአባቶች እና ለአጠባባቂዎች ግልጽ የጤና መረጃ ያጋሩ።" },
    "om": { "body": "Odeeffannoo fayyaa ifa haadhaafi warraaf kennamee — nageenya sadarkaa hundaatti." }
  }'::jsonb
)
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();

-- Pregnancy week 1 — minimal structure (expand sections in JSON as needed)
insert into public.content_translations (namespace, entity_id, translations)
values (
  'pregnancy_week',
  '1',
  $json${
    "en": {
      "title": "Week 1",
      "subtitle": "First week — pre-pregnancy preparation",
      "image_note": "Menstrual period",
      "sections": [
        {
          "title": "What is happening",
          "body": "Pregnancy is counted from the first day of your last menstrual period (LMP).",
          "bullets": ["You are on your period", "No pregnancy yet"],
          "is_urgent": false
        }
      ]
    },
    "am": {
      "title": "ሳምንት 1",
      "subtitle": "የመጀመሪያ ሳምንት",
      "image_note": "የወር አበባ",
      "sections": [
        {
          "title": "ምን እየተከሰተ ነው",
          "body": "እርግዝና ከመጨረሻዎ የወር አበባ ቀን ይቆጠራል።",
          "bullets": ["የወር አበባ ላይ ነዎት", "እርግዝና ገና የለም"],
          "is_urgent": false
        }
      ]
    },
    "om": {
      "title": "Torban 1",
      "subtitle": "Torban jalqabaa",
      "image_note": "Yeroo dhiibbaa dhiigaa",
      "sections": [
        {
          "title": "Maaltu taphee jira",
      "body": "Ulfaa guyyaa jalqabaa yeroo dhiibbaa dhiigaa dhumaa irraa kan lakkaa'amu dha.",
      "bullets": ["Yeroo dhiibbaa dhiigaa irratti", "Ulfaa ammallee hin jiru"],
          "is_urgent": false
        }
      ]
    }
  }$json$::jsonb
)
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();
