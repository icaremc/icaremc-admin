-- ICARE-MC — Migrate hardcoded app content into Supabase
--
-- Run order (Supabase Dashboard → SQL Editor):
--   1) supabase/schema.sql
--   2) supabase/content_translations.sql
--   3) THIS FILE: supabase/hardcoded_content_migration.sql
--
-- This seeds content that is currently hardcoded in Flutter:
-- - lib/features/introduction_content.dart
-- - lib/features/health_tips/daily_tips.dart
-- - lib/lang/calculator_education.dart
-- - lib/features/child_milestone/milestones_data.dart
-- - lib/features/pregnancy_week/pregnancy_weeks_data.dart
--
-- Notes:
-- - `content_translations.translations` requires at least `"en"` to exist.
-- - Where translations are not yet available for am/om, only `"en"` is seeded.

begin;

-- ---------------------------------------------------------------------------
-- Introduction content (EN only in current code)
-- ---------------------------------------------------------------------------
insert into public.content_translations (namespace, entity_id, translations)
values
  (
    'about',
    'about',
    $json${ "en": { "body": "An app that helps mothers understand the care they should give themselves and their children." } }$json$::jsonb
  ),
  (
    'about',
    'mission',
    $json${ "en": { "body": "Share clear health information with mothers, fathers, and caregivers—supporting safety at every stage and helping spot concerns early." } }$json$::jsonb
  ),
  (
    'about',
    'vision',
    $json${ "en": { "body": "A trusted maternal and child health app in Ethiopia and beyond—for growth monitoring, counseling, and early awareness." } }$json$::jsonb
  ),
  (
    'about',
    'disclaimer',
    $json${ "en": { "body": "Educational resources only. This does not replace professional medical advice. Always consult a qualified healthcare provider." } }$json$::jsonb
  )
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Daily tips (EN / AM / OM) — UUID per tip; week 1 has days 1–7, week 2 has day 1
-- ---------------------------------------------------------------------------
insert into public.content_translations (namespace, entity_id, translations)
values
  (
    'daily_tip',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    $json${ "en": { "week_number": 1, "day_number": 1, "text": "Drink plenty of water today — hydration supports you and your baby." }, "am": { "text": "ዛሬ ብዙ ውሃ ይጠጡ — ለእርስዎ እና ለሕፃንዎ ይረዳል።" }, "om": { "text": "Har’a bishaan baay’ee dhugaa — kunuunsa keef fi daa’ima keetiif gargaara." } }$json$::jsonb
  ),
  (
    'daily_tip',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    $json${ "en": { "week_number": 1, "day_number": 2, "text": "Take short walks if your provider says it is safe — gentle movement helps circulation." }, "am": { "text": "አቅራቢዎ ካስፈቀደ አጭር ጉዞ ይውሉ — ቀላል እንቅስቃሴ ደምን ያሻሽላል።" }, "om": { "text": "Yoo nagaan ta’e taa’ii gabaaba fudhadhu — sochii salphaa dhiigaa fooyya’a." } }$json$::jsonb
  ),
  (
    'daily_tip',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    $json${ "en": { "week_number": 1, "day_number": 3, "text": "Rest when you feel tired. Your body is doing important work." }, "am": { "text": "ድካን ሲሰማዎት ዕረፍት ይውሉ። ሰውነትዎ አስፈላጊ ስራ እያከናወነ ነው።" }, "om": { "text": "Yoo dadhabde boqaa — qaamni kee hojii barbaachisaa hojjechaa jira." } }$json$::jsonb
  ),
  (
    'daily_tip',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
    $json${ "en": { "week_number": 1, "day_number": 4, "text": "Eat iron-rich foods (beans, lentils, greens) with vitamin C for better absorption." }, "am": { "text": "ብረት የሚያስገቡ ምግቦች (ባቄላ፣ አተር፣ አረንጓዴ) ከቪታሚን C ጋር ይበሉ።" }, "om": { "text": "Nyaata sibiila qabeessa (baaqelaa, shiro, magaariisa) fi viitaaminii C waliin nyaadhu." } }$json$::jsonb
  ),
  (
    'daily_tip',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
    $json${ "en": { "week_number": 1, "day_number": 5, "text": "Wash hands often — simple hygiene protects mother and baby." }, "am": { "text": "እጆችን ብዙ ይታጠቡ — ቀላል ንጽህና እናትንና ሕፃንን ይጠብቃል።" }, "om": { "text": "Harka yeroo hedduu dhiqi — qulqullina salphaa haadha fi daa’ima eega." } }$json$::jsonb
  ),
  (
    'daily_tip',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06',
    $json${ "en": { "week_number": 1, "day_number": 6, "text": "Attend prenatal visits on schedule. Early care prevents many problems." }, "am": { "text": "የእርግዝና ጉብኝቶችን በጊዜ ይገቡ። ቀደም ብሎ እንክብካቤ ብዙ ችግሮችን ይከላከላል።" }, "om": { "text": "Daawwannaa ulfaa yeroo isaa qabaa — kunuunsa dursa rakkoo hedduu ni ittisa." } }$json$::jsonb
  ),
  (
    'daily_tip',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07',
    $json${ "en": { "week_number": 1, "day_number": 7, "text": "If you feel severe headache, vision changes, or swelling, seek care immediately." }, "am": { "text": "ከባድ ራስ ህመም፣ የራድ ለውጥ ወይም መታጠቅ ካለ ወዲያውኑ እንክብካቤ ይፈልጉ።" }, "om": { "text": "Dhukkubbii mataa cimaa, jijjiirama argii ykn guddina qaamaa yoo qabaatte hatattamaan fayyadamtoota qunnami." } }$json$::jsonb
  ),
  (
    'daily_tip',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a08',
    $json${ "en": { "week_number": 2, "day_number": 1, "text": "Talk to your baby — bonding begins before birth." }, "am": { "text": "ከሕፃንዎ ጋር ይነጋገሩ — ትስስር ከመውለድ በፊት ይጀምራል።" }, "om": { "text": "Daa’ima kee waliin haasa’i — walitti hidhamiinsa dhaluu duraan jalqaba." } }$json$::jsonb
  )
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Calculator education (EN / AM / OM)
-- entity_id is a UUID; translations.en.topic_key is the stable app lookup key.
-- ---------------------------------------------------------------------------
insert into public.content_translations (namespace, entity_id, translations)
values
  (
    'calculator_edu',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    $json${
      "en": { "topic_key": "edd_lnmp", "title": "EDD from last normal menstrual period", "formula": "EDD = LNMP + 9 months + 7 days", "description": "If you have regular monthly menstrual periods, enter the first day of your last period.", "example": "Example: LNMP = July 10, 2025 → +9 months = April 10, 2026 → +7 days = April 17, 2026 (EDD)" },
      "am": { "title": "ካለፈው መደበኛ የወር አበባ — የመውለጃ ጊዜ", "formula": "የመውለጃ ጊዜ = LNMP + 9 ወር + 7 ቀን", "description": "በየወሩ የወር አበባ የሚያዩ ከሆነ፣ የመጨረሻ ያዩበትን የወር አበባ ቀን ያስገቡ።", "example": "LNMP = July 10, 2025 + 9 ወር = April 10, 2026 + 7 ቀን = April 17, 2026" },
      "om": { "title": "Guyyaa dhalootii ulfaa kan yeroo dhiibbaa dhiiraa dhumaa irratti hundaa’e", "formula": "Guyyaa Ulfa Dhaluutti Eeggamu = Yeroo dhiibbaa dhiiraa dhumaa kan sirrii ta’e + 9 Ji’oota + Guyyaa Torba", "description": "Yoo dhiibbaa dhiigaa ji’aan sirrii qabaatte, guyyaa dhumaa itti argite galchi.", "example": "Fakkeenya: LNMP = July 10, 2025 + 9 ji’a = April 10, 2026 + 7 guyyaa = April 17, 2026" }
    }$json$::jsonb
  ),
  (
    'calculator_edu',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    $json${
      "en": { "topic_key": "edd_ultrasound", "title": "EDD from ultrasound (before 13 weeks)", "formula": "EDD = Date of ultrasound + (40 weeks − gestational age at ultrasound)", "description": "If periods are not monthly, use fetal age from an early ultrasound (first 3 months): enter GA at scan and scan date." },
      "am": { "title": "በአልትራሳውንድ — የመውለጃ ጊዜ", "formula": "የመውለጃ ጊዜ = አልትራሳውንድ ቀን + (40 ሳምንት − በአልትራሳውንድ የተገመተው GA)", "description": "በየወሩ የወር አበባ የማያዩ ከሆነ፣ በመጀመሪያዎቹ 3 ወራት በአልትራሳውንድ የተሰጠውን ዕድሜ እና ቀን ያስገቡ።" },
      "om": { "title": "Guyyaa dhalootii ulfaa kan qorannoo ultrasound irratti hundaa’e", "formula": "Guyyaa Ulfa Dhaluutti Eeggamu = Guyyaa qorannoo ultrasound + (Torban 40 − Umrii ulfaa yeroo qorannoo)", "description": "Yoo dhiibbaa dhiigaa ji’aan sirrii hin qabne, umurii daa’ima ultrasound ji’a sadii jalqabaa keessatti kennameen shallagama — umurii fi guyyaa ultrasound galchi." }
    }$json$::jsonb
  ),
  (
    'calculator_edu',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    $json${
      "en": { "topic_key": "edd_ivf", "title": "EDD from embryo transfer (IVF)", "formula": "EDD = Date of embryo transfer + 38 weeks", "description": "If pregnant through IVF, enter the date the embryo was transferred to the uterus." },
      "am": { "title": "IVF — የመውለጃ ጊዜ", "formula": "የመውለጃ ጊዜ = ጽንስ በማህፀን የተደረገበት ቀን + 38 ሳምንት", "description": "በIVF ካረገዙ ጽንሱ በማህፀን የተደረገበትን ቀን ያስገቡ።" },
      "om": { "title": "Guyyaa dhalootii ulfaa kan ulfa IVF irratti hundaa’e", "formula": "Guyyaa Ulfa Dhaluutti Eeggamu = Guyyaa darbii embryo + Torban 38", "description": "Yoo ulfaa IVF’n taate, guyyaa embryo gara garaachaatti galfame galchi." }
    }$json$::jsonb
  ),
  (
    'calculator_edu',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
    $json${
      "en": { "topic_key": "ga_lnmp", "title": "Gestational age from LNMP", "formula": "Gestational age (weeks) = (Today − First day of LNMP) ÷ 7", "description": "Count from the first day of LNMP. Subtract LNMP from today, then divide by 7 for completed weeks." },
      "am": { "title": "የእርግዝና ዕድሜ ከ LNMP", "formula": "የእርግዝና ዕድሜ (ሳምንታት) = (የአሁን ቀን − LNMP) ÷ 7", "description": "ከ LNMP የመጀመሪያ ቀን ጀምሮ ይቁጠሩ። በ 7 ያካፍሉ።" },
      "om": { "title": "Umrii ulfaa irraa LNMP", "formula": "Umrii ulfaa (torban) = (Guyyaa ammaa − Guyyaa jalqabaa LNMP) / 7", "description": "Guyyaa jalqabaa LNMP irraa jalqabi. Guyyaa adda baasi, 7n qoodi." }
    }$json$::jsonb
  ),
  (
    'calculator_edu',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
    $json${
      "en": { "topic_key": "ga_ultrasound", "title": "Gestational age from early ultrasound", "formula": "GA (weeks) = GA at ultrasound + (Days since ultrasound ÷ 7)", "description": "Enter the GA reported on the scan day and the ultrasound date. Add days since scan (÷7) to GA at scan." },
      "am": { "title": "የእርግዝና ዕድሜ ከ አልትራሳውንድ", "formula": "GA = GA በአልትራሳውንድ + (ከማረሚያው ቀን ጀምሮ ቀናት ÷ 7)", "description": "በማረሚያው ቀን የተሰጠ GA እና የማረሚያው ቀን ያስገቡ።" },
      "om": { "title": "Umrii ulfaa irraa ultrasound duraa", "formula": "Umrii ulfaa (torban) = GA yeroo ultrasound + (Guyyaa ultrasound irraa har’aatti / 7)", "description": "GA yeroo ultrasound fi guyyaa qorannoo galchi. Guyyaa ultrasound irraa har’aatti lakkaa’i, 7n qoodi." }
    }$json$::jsonb
  ),
  (
    'calculator_edu',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06',
    $json${
      "en": { "topic_key": "ga_ivf", "title": "Gestational age from embryo transfer (IVF)", "formula": "GA today = GA on transfer day + (Days since transfer ÷ 7)", "description": "GA on transfer day = 2 weeks + embryo age in days. Count days since transfer, divide by 7, and add." },
      "am": { "title": "የእርግዝና ዕድሜ ከ IVF", "formula": "GA ዛሬ = GA በዝውውር + (ከዝውውር ቀናት ÷ 7)", "description": "GA በዝውውር = 2 ሳምንት + የፅንስ ዕድሜ በቀናት።" },
      "om": { "title": "Umrii ulfaa irraa embryo transfer (ulfa IVF)", "formula": "GA har’a = GA guyyaa transfer + (Guyyaa transfer irraa har’aatti / 7)", "description": "GA guyyaa transfer = Torban 2 + umurii embryo guyyaa keessatti. Guyyaa transfer irraa lakkaa’i, 7n qoodi." }
    }$json$::jsonb
  )
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Child milestones (EN only in current code)
-- ---------------------------------------------------------------------------
insert into public.content_translations (namespace, entity_id, translations)
values
  (
    'milestone',
    '2',
    $json${
      "en": {
        "months": 2,
        "label": "2 months",
        "growth": {
          "boys": {
            "weight_range": "4.4 kg (9.7 lbs) – 7.0 kg (15.4 lbs)",
            "length_range": "54 cm (21.3 in) – 61 cm (24.0 in)",
            "head_circumference_range": "~36.9 cm – ~41.3 cm",
            "weight_average": "~5.6 kg (12.3 lbs)",
            "length_average": "~57 cm (22.4 in)",
            "head_average": "~39.1 cm"
          },
          "girls": {
            "weight_range": "4.0 kg (8.8 lbs) – 6.5 kg (14.3 lbs)",
            "length_range": "53 cm (20.9 in) – 60 cm (23.6 in)",
            "head_circumference_range": "~36.1 cm – ~40.5 cm",
            "weight_average": "~5.1 kg (11.2 lbs)",
            "length_average": "~56 cm (22.0 in)",
            "head_average": "~38.3 cm"
          }
        },
        "categories": [
          {
            "title": "Communication (speech & language)",
            "items": ["Makes sounds other than crying", "Responds to loud noises"]
          },
          {
            "title": "Cognitive & early learning",
            "items": ["Sees you moving", "Looks at objects for several seconds"]
          },
          {
            "title": "Physical movement, fingers & emotions",
            "items": ["Lifts head when lying on stomach", "Lifts both arms and legs", "Opens hands spontaneously"]
          }
        ]
      }
    }$json$::jsonb
  ),
  (
    'milestone',
    '4',
    $json${
      "en": {
        "months": 4,
        "label": "4 months",
        "categories": [
          {
            "title": "Communication (speech & language)",
            "items": ["Makes cooing sounds like \"oooo\" and \"aahh\"", "Responds with sounds when you talk", "Turns toward your voice"]
          },
          {
            "title": "Cognitive & early learning",
            "items": ["Opens mouth when seeing breast or bottle when hungry", "Looks at hands with curiosity"]
          },
          {
            "title": "Physical movement, fingers & emotions",
            "items": ["Holds head steadily without support when held", "Holds a toy placed in their hand", "Uses hands to grasp toys", "Brings hands to mouth", "Pushes up on elbows/arms when on stomach"]
          }
        ]
      }
    }$json$::jsonb
  ),
  (
    'milestone',
    '6',
    $json${
      "en": {
        "months": 6,
        "label": "6 months",
        "categories": [
          {
            "title": "Communication (speech & language)",
            "items": ["Takes turns making sounds with you", "Recognizes familiar faces and responds to emotions", "Laughs and shows affection"]
          },
          {
            "title": "Cognitive & early learning",
            "items": ["Puts objects in mouth to explore", "Reaches for someone to pick up a wanted toy", "Closes lips to show they do not want more food"]
          },
          {
            "title": "Physical movement, fingers & emotions",
            "items": ["Rolls from stomach to back", "Pushes up on arms while on stomach", "Leans on hands for support while sitting"]
          }
        ]
      }
    }$json$::jsonb
  ),
  (
    'milestone',
    '9',
    $json${
      "en": {
        "months": 9,
        "label": "9 months",
        "categories": [
          {
            "title": "Communication (speech & language)",
            "items": ["Says sounds like \"mamamama\" and \"babababa\"", "Stretches arms to be picked up"]
          },
          {
            "title": "Cognitive & early learning",
            "items": ["Looks for hidden objects (e.g. spoon or toy)", "Bangs two objects together in their hands"]
          },
          {
            "title": "Physical movement, fingers & emotions",
            "items": ["Gets into sitting alone", "Moves objects from one hand to the other", "Uses fingers to bring food to mouth", "Sits without support and crawls"]
          }
        ]
      }
    }$json$::jsonb
  ),
  (
    'milestone',
    '12',
    $json${
      "en": {
        "months": 12,
        "label": "1 year",
        "categories": [
          {
            "title": "Communication (speech & language)",
            "items": ["Waves to say goodbye", "Calls a parent \"mama\" or \"dada\" or names another person", "Understands \"no\" — pauses or stops when told no"]
          },
          {
            "title": "Cognitive & early learning",
            "items": ["Puts something in a container; fits a block into a cup", "Looks for what you hide (e.g. doll under a blanket)"]
          },
          {
            "title": "Physical movement, fingers & emotions",
            "items": ["Babbles or calls to get attention", "Walks with support", "Drinks from a cup without a lid", "Picks up small objects between thumb and index finger"]
          }
        ]
      }
    }$json$::jsonb
  )
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Pregnancy weeks 1–10 (EN only in current code)
-- ---------------------------------------------------------------------------
insert into public.content_translations (namespace, entity_id, translations)
values
  (
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
            "body": "Pregnancy is counted from the first day of your last menstrual period (LMP), not from conception. This is when you begin preparing for conception.",
            "bullets": ["You are on your period (uterine lining shedding)", "Development of eggs begins", "No pregnancy yet"],
            "is_urgent": false
          },
          {
            "title": "Precautions",
            "body": "",
            "bullets": [
              "Adjust lifestyle: avoid smoking, alcohol, and caffeine",
              "Eat a balanced diet rich in iron and calcium",
              "Begin folic acid 0.4 mg daily to reduce neural tube defect risk — continue before pregnancy and through the first 12 weeks",
              "Higher dose may be needed if you had a prior neural tube defect, diabetes, or other chronic illness — ask your healthcare provider"
            ],
            "is_urgent": false
          }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '2',
    $json${
      "en": {
        "title": "Week 2",
        "subtitle": "Ovulation and fertilization (pre-pregnancy)",
        "image_note": "Ovulation and fertilization",
        "sections": [
          {
            "title": "Overview",
            "body": "Week 2 is still before pregnancy begins. Fertilization usually happens at the end of this week or early in week 3. Symptoms now are often from ovulation, not pregnancy.",
            "bullets": [],
            "is_urgent": false
          },
          {
            "title": "Body changes",
            "body": "",
            "bullets": [
              "Ovary prepares for ovulation",
              "Estrogen and LH rise; ovulation typically days 12–14",
              "Possible nausea and lower back pain",
              "Cervical mucus becomes clear and stretchy (helps sperm travel)"
            ],
            "is_urgent": false
          },
          {
            "title": "Precautions",
            "body": "",
            "bullets": [
              "Healthy lifestyle: water, nutrient-rich food, moderate exercise",
              "Avoid alcohol, smoking, and excess caffeine",
              "Intercourse every 1–2 days can improve conception chances",
              "Start folic acid 0.4 mg daily (12 weeks before and early pregnancy)",
              "Consult your provider for higher dose if prior neural tube defect, diabetes, epilepsy, or similar conditions"
            ],
            "is_urgent": false
          }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '3',
    $json${
      "en": {
        "title": "Week 3",
        "subtitle": "Implantation begins",
        "image_note": "Fertilized egg implanting in the uterine wall",
        "sections": [
          {
            "title": "Fetal development",
            "body": "",
            "bullets": [
              "Fertilized egg (zygote) divides into a blastocyst (size of a grain of salt)",
              "Around days 20–24, implantation in the uterine wall",
              "Blastocyst produces hCG to support progesterone and pregnancy"
            ],
            "is_urgent": false
          },
          {
            "title": "Possible symptoms",
            "body": "Often no symptoms. In 20–25% of women: light spotting, bleeding, or cramps for 1–2 days during implantation. Urine tests may stay negative until week 4+; blood tests can be earlier.",
            "bullets": [],
            "is_urgent": false
          },
          {
            "title": "Precautions",
            "body": "",
            "bullets": [
              "Hydration, balanced meals, moderate exercise",
              "Avoid alcohol, cigarettes, excess caffeine",
              "Avoid raw or undercooked meat",
              "Continue folic acid 0.4 mg daily unless your provider advises a higher dose"
            ],
            "is_urgent": false
          },
          {
            "title": "See a doctor urgently if",
            "body": "",
            "bullets": ["Heavy bleeding", "Severe abdominal pain"],
            "is_urgent": true
          }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '4',
    $json${
      "en": {
        "title": "Week 4",
        "subtitle": "Pregnancy often detectable on a test",
        "image_note": "Embryo 1–2 mm, fully implanted",
        "sections": [
          { "title": "Fetal development", "body": "", "bullets": ["Embryo about 1–2 mm", "Fully implanted in the uterus"], "is_urgent": false },
          { "title": "Possible signs", "body": "", "bullets": ["Missed period (reliable if cycles are regular)", "Breast tenderness, fatigue, mood changes", "Light implantation spotting; frequent urination", "Mild nausea may begin"], "is_urgent": false },
          { "title": "Precautions", "body": "", "bullets": ["Confirm pregnancy with a test", "Schedule first prenatal visit", "Folic acid 400 mcg (0.4 mg) daily until week 12", "Vitamin D 10 mcg (400 IU) daily if low sun exposure", "Stop smoking, alcohol, recreational drugs; limit caffeine to ~200 mg/day (~2 cups coffee)", "Avoid raw meat and unpasteurized milk", "Consult your doctor before changing medications if you have chronic conditions"], "is_urgent": false },
          { "title": "See a doctor urgently if", "body": "", "bullets": ["Heavy bleeding or severe cramping"], "is_urgent": true }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '5',
    $json${
      "en": {
        "title": "Week 5",
        "subtitle": "Brain, spine, and heart begin to form",
        "image_note": "Embryo 2–3 mm; placenta starting to nourish the baby",
        "sections": [
          { "title": "Baby development", "body": "", "bullets": ["About the size of a sesame seed (2–3 mm)", "Neural tube forming (future brain and spinal cord)", "Heart structure develops; beating begins soon", "Placenta starts forming", "Early signs of nose and eyes"], "is_urgent": false },
          { "title": "Possible symptoms", "body": "", "bullets": ["Missed period, mood swings, fatigue", "Breast tenderness, nausea at any time of day", "Frequent urination, mild spotting or cramps", "Stronger smell, appetite changes or food aversions"], "is_urgent": false },
          { "title": "Precautions", "body": "", "bullets": ["Take a pregnancy test if not done yet", "Book first healthcare visit", "Folic acid 0.4 mg daily until week 12; vitamin D if needed", "No smoking, alcohol, or recreational drugs; caffeine under 200 mg/day", "Avoid raw meat and unpasteurized milk"], "is_urgent": false },
          { "title": "See a doctor urgently if", "body": "", "bullets": ["Severe pain or heavy bleeding (ectopic pregnancy or miscarriage concern)", "Unusual cravings for non-food items (e.g. soil) — may suggest iron deficiency"], "is_urgent": true }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '6',
    $json${
      "en": {
        "title": "Week 6",
        "subtitle": "Heart begins to beat",
        "image_note": "Fetus 2–6 mm; heart beating (~90–110 bpm)",
        "sections": [
          { "title": "Fetal development", "body": "", "bullets": ["2–6 mm long (about pea-sized)", "Heart beats (~90–110 beats/min)", "Brain, spinal cord, liver, digestive and respiratory systems developing", "Limb buds and early eye and inner ear structures forming"], "is_urgent": false },
          { "title": "Possible symptoms", "body": "", "bullets": ["Hormonal mood swings, fatigue, breast pain", "Nausea any time of day; more frequent urination", "Heightened smell; appetite changes"], "is_urgent": false },
          { "title": "Precautions", "body": "", "bullets": ["Schedule first medical visit", "Folic acid and vitamin D as advised", "Lifestyle: no smoking, alcohol, or drugs; caffeine under 200 mg/day", "Avoid unsafe raw or unpasteurized foods"], "is_urgent": false },
          { "title": "See a doctor urgently if", "body": "", "bullets": ["Persistent vomiting (cannot keep food or fluids)", "Heavy bleeding or severe cramps", "Any unusual or worrying symptoms"], "is_urgent": true }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '7',
    $json${
      "en": {
        "title": "Week 7",
        "subtitle": "Rapid brain growth; placenta developing",
        "image_note": "Fetus ~10 mm; placenta developing",
        "sections": [
          { "title": "Fetal development", "body": "", "bullets": ["About 10 mm long", "Connected to mother for oxygen and nutrients", "Lungs and digestive tube developing quickly", "Mouth, nostrils, ears, and eye lenses forming", "Hands and feet lengthening", "Brain may produce ~100 new cells per minute"], "is_urgent": false },
          { "title": "Changes in your body", "body": "", "bullets": ["More blood produced to support pregnancy", "Cervix makes fluid that helps protect the uterus"], "is_urgent": false },
          { "title": "Possible symptoms", "body": "", "bullets": ["Mood swings, fatigue, breast swelling", "Nausea, frequent urination", "Smell sensitivity and food aversions"], "is_urgent": false },
          { "title": "Precautions", "body": "", "bullets": ["If LMP date is unknown, confirm gestational age with ultrasound", "Drink up to ~8 glasses of fluid daily", "Book first appointment; continue folic acid and vitamin D", "Healthy lifestyle and safe food choices as in prior weeks"], "is_urgent": false },
          { "title": "See a doctor urgently if", "body": "", "bullets": ["Persistent vomiting", "Heavy bleeding or severe cramps"], "is_urgent": true }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '8',
    $json${
      "en": {
        "title": "Week 8",
        "subtitle": "Time for your first prenatal visit",
        "image_note": "Fetus 11–16 mm, ~1.2 g",
        "sections": [
          { "title": "Fetal development", "body": "", "bullets": ["11–16 mm long, about 1.2 g", "Fingers beginning to form; hands and feet longer", "Jaw, nose, eyelids, and ears developing", "Heart, lungs, kidneys, and brain linked by nerves", "Baby may start moving (you usually cannot feel it yet)"], "is_urgent": false },
          { "title": "Changes in your body", "body": "", "bullets": ["Morning sickness: nausea and vomiting", "Fatigue and breast tenderness", "Frequent urination from uterus on bladder"], "is_urgent": false },
          { "title": "Precautions", "body": "", "bullets": ["First prenatal visit usually between weeks 8–12", "Provider confirms pregnancy, estimates due date, may order labs or ultrasound", "Small frequent meals; iron- and folate-rich foods", "Rest, fluids, no alcohol or smoking"], "is_urgent": false },
          { "title": "See a doctor urgently if", "body": "", "bullets": ["Heavy bleeding", "Severe cramps", "Unusual symptoms"], "is_urgent": true }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '9',
    $json${
      "en": {
        "title": "Week 9",
        "subtitle": "Major organs forming",
        "image_note": "Fetus ~2.2 cm, ~2 g",
        "sections": [
          { "title": "Fetal development", "body": "", "bullets": ["About 2.2 cm (~2 g)", "Heart, brain, lungs, kidneys, and intestines forming", "Eyelids, mouth, tongue; fingers growing", "Sex organs developing; sex often seen on ultrasound after ~18–21 weeks"], "is_urgent": false },
          { "title": "Possible symptoms", "body": "", "bullets": ["Morning sickness, extreme fatigue, mood swings", "Breast pain and enlargement", "Headaches, strong smells, food aversions"], "is_urgent": false },
          { "title": "Precautions", "body": "", "bullets": ["Continue prenatal vitamins (folic acid ≥400 mcg through week 12; vitamin D if low sun)", "Small frequent meals; boiled eggs, fruit, whole grains may ease nausea", "~10 minutes brisk walking daily if approved by your provider", "Stay hydrated; no smoking or alcohol; limit caffeine", "Booking visit weeks 8–12: screening labs and ultrasound as offered"], "is_urgent": false },
          { "title": "See a doctor urgently if", "body": "", "bullets": ["Cannot keep food or fluids (dehydration risk)", "Bleeding or severe cramps"], "is_urgent": true }
        ]
      }
    }$json$::jsonb
  ),
  (
    'pregnancy_week',
    '10',
    $json${
      "en": {
        "title": "Week 10",
        "subtitle": "Rapid growth and early movements",
        "image_note": "Fetus ~3 cm (1.2 inches)",
        "sections": [
          { "title": "Fetal development", "body": "", "bullets": ["About 3 cm (1.2 inches) long", "Heart rate ~180 bpm (much faster than yours)", "Upper lip, nostrils, jaw with tiny tooth buds, ears, eyelids forming", "Movement may be visible on ultrasound"], "is_urgent": false },
          { "title": "Common symptoms", "body": "", "bullets": ["Fatigue, nausea, smell aversions", "Mood swings from peak hormone changes", "Digestive issues: bloating, heartburn", "Skin changes: dark patches (chloasma), oily skin, or acne"], "is_urgent": false },
          { "title": "Precautions", "body": "", "bullets": ["Small frequent meals; plenty of water or ginger tea", "Avoid spicy or greasy food if heartburn is bothersome", "Attend prenatal check-up; take daily vitamins as prescribed"], "is_urgent": false },
          { "title": "See a doctor urgently if", "body": "", "bullets": ["Heavy bleeding", "Severe or persistent abdominal pain", "Severe nausea or vomiting with dehydration"], "is_urgent": true }
        ]
      }
    }$json$::jsonb
  )
on conflict (namespace, entity_id) do update
set translations = excluded.translations,
    version = public.content_translations.version + 1,
    updated_at = now();

commit;

