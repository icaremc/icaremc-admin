-- Seed nutrition guidance for each child growth milestone (admin Checklist → Nutrition).
-- Safe to re-run: updates English translations only; does not wipe milestones/red_flags.
-- Requires child_growth_periods rows (age_months) to already exist.
--
-- Run in Supabase SQL editor.

update public.child_growth_period_translations as t
set
  nutrition = v.nutrition,
  updated_at = now()
from public.child_growth_periods as p
join (
  values
  -- ── Newborn (0 months) ──
  (
    0,
    $json$[
      {
        "title": "Exclusive breastfeeding",
        "body": "Breast milk is all the nutrition a newborn needs for the first 6 months.",
        "bullets": [
          "Feed on demand - usually 8-12 times in 24 hours",
          "Watch for hunger cues: rooting, hand-to-mouth, fussing (crying is a late sign)",
          "Offer both breasts each feed if baby is still hungry",
          "No water, tea, juice, or other milk unless a clinician advises"
        ],
        "is_urgent": false
      },
      {
        "title": "Wet and dirty nappies",
        "body": "Nappies help you know baby is getting enough milk.",
        "bullets": [
          "By day 5: about 6 or more wet nappies per day",
          "Soft stools are normal for breastfed babies",
          "Seek care if baby is too sleepy to feed or has fewer wet nappies"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 6 weeks (1 month) ──
  (
    1,
    $json$[
      {
        "title": "Keep exclusive breastfeeding",
        "body": "Continue breast milk only. Growth spurts are common around this age.",
        "bullets": [
          "Feed whenever baby shows hunger cues",
          "Night feeds are still normal and important",
          "Do not start cereal, water, or formula unless advised by a clinician",
          "Mother: eat a varied diet and drink enough fluids"
        ],
        "is_urgent": false
      },
      {
        "title": "Position and latch",
        "body": "A good latch helps baby feed well and protects the mother’s nipples.",
        "bullets": [
          "Baby’s mouth should cover more of the areola below the nipple",
          "Feeding should not be sharply painful after the first moments",
          "Ask a health worker for help if latch is painful or baby is not gaining"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 2 months ──
  (
    2,
    $json$[
      {
        "title": "Exclusive breastfeeding continues",
        "body": "Baby still needs only breast milk - no complementary foods yet.",
        "bullets": [
          "Feed on demand, day and night",
          "Expect cluster feeding during growth spurts",
          "Avoid bottles of water, tea, or juice",
          "If using formula (only if needed), follow safe preparation instructions"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 4 months ──
  (
    4,
    $json$[
      {
        "title": "Still exclusive breastfeeding",
        "body": "WHO recommends exclusive breastfeeding until 6 months. Most babies are not ready for solids yet.",
        "bullets": [
          "Continue breast milk only until around 6 months",
          "Do not start porridge, fruit, or other foods early unless a clinician advises",
          "Early solids can replace milk and increase infection risk",
          "Keep responding to hunger and fullness cues"
        ],
        "is_urgent": false
      },
      {
        "title": "Getting ready for solids (soon)",
        "body": "Around 6 months, look for readiness signs - not calendar age alone.",
        "bullets": [
          "Sits with support and holds head steady",
          "Shows interest in food",
          "Opens mouth when food is offered"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 6 months ──
  (
    6,
    $json$[
      {
        "title": "Start complementary foods",
        "body": "At about 6 months, begin soft foods while continuing breastfeeding.",
        "bullets": [
          "Continue breastfeeding on demand",
          "Start with 2-3 soft meals per day (smooth porridge, mashed banana, potato, avocado)",
          "Offer iron-rich foods (fortified porridge, meat, egg yolk, legumes - age-appropriate)",
          "Start with 2-3 teaspoons and increase slowly",
          "Always supervise; never force-feed"
        ],
        "is_urgent": false
      },
      {
        "title": "Safe feeding",
        "body": "Clean hands, clean utensils, and freshly prepared food protect baby.",
        "bullets": [
          "Wash hands before preparing food and feeding",
          "Use clean bowls and spoons",
          "Avoid honey before 12 months",
          "No whole nuts, hard pieces, or round foods that can choke"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 9 months ──
  (
    9,
    $json$[
      {
        "title": "More variety and texture",
        "body": "Baby can try thicker mashed foods and soft finger foods while breastfeeding continues.",
        "bullets": [
          "Aim for 3-4 meals plus 1-2 healthy snacks per day",
          "Offer soft finger foods: ripe banana, soft cooked vegetables, soft bread pieces",
          "Include animal-source foods when available (egg, meat, fish, dairy)",
          "Continue breastfeeding alongside complementary foods",
          "Offer water in a clean cup with meals"
        ],
        "is_urgent": false
      },
      {
        "title": "Self-feeding practice",
        "body": "Let baby practice picking up food - mess is part of learning.",
        "bullets": [
          "Encourage finger feeding",
          "Offer a soft spoon for practice",
          "Sit with baby during meals"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 12 months ──
  (
    12,
    $json$[
      {
        "title": "Family foods",
        "body": "By 1 year, most children can share soft family meals, with breastfeeding continued as desired.",
        "bullets": [
          "Offer 3 meals and 2 snacks from the family pot (soft, cut small)",
          "Continue breastfeeding for as long as mother and child wish (WHO: up to 2 years or beyond)",
          "Include fruits, vegetables, grains, legumes, and protein foods",
          "Limit sugary drinks and packaged snacks",
          "Whole cow’s milk as a main drink is usually fine from 12 months if advised locally"
        ],
        "is_urgent": false
      },
      {
        "title": "Cup drinking",
        "body": "Practice drinking from an open cup.",
        "bullets": [
          "Offer water or milk in a cup",
          "Avoid bottles for juice or sweet drinks",
          "Expect some spills while learning"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 15 months ──
  (
    15,
    $json$[
      {
        "title": "Toddler meals",
        "body": "Offer regular meals and snacks. Appetite can vary day to day.",
        "bullets": [
          "3 meals + 2 snacks on a predictable schedule",
          "Let the child self-feed with fingers and a spoon",
          "Offer new foods many times - refusal is normal at first",
          "Avoid using food as a reward or punishment",
          "Continue breastfeeding if still desired"
        ],
        "is_urgent": false
      },
      {
        "title": "Foods to limit",
        "body": "Protect teeth and growth with fewer sugary and ultra-processed foods.",
        "bullets": [
          "Limit sweets, biscuits, and soft drinks",
          "Avoid tea/coffee for young children",
          "Cut grapes, hot dogs, and hard foods into safe small pieces"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 18 months ──
  (
    18,
    $json$[
      {
        "title": "Balanced toddler diet",
        "body": "Offer a mix of energy, protein, and micronutrient-rich foods each day.",
        "bullets": [
          "Include vegetables/fruit, staples (injera, rice, potato), legumes, and animal foods when possible",
          "Offer iron-rich foods regularly",
          "Serve small portions; allow second helpings if hungry",
          "Eat together as a family when you can",
          "Keep breastfeeding if mother and child wish"
        ],
        "is_urgent": false
      },
      {
        "title": "Picky eating",
        "body": "Many toddlers become selective. Stay calm and keep offering variety.",
        "bullets": [
          "Do not force or bribe",
          "Offer one familiar food with one new food",
          "Keep meal times short and pleasant"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 24 months (2 years) ──
  (
    24,
    $json$[
      {
        "title": "Family table",
        "body": "Most 2-year-olds can eat soft family foods cut into safe pieces.",
        "bullets": [
          "3 meals + 1-2 snacks",
          "Offer water as the main drink between meals",
          "Limit juice; if given, keep to a small amount with meals",
          "Include dairy or calcium-rich alternatives as available",
          "Breastfeeding may continue; stop when mother and child are ready"
        ],
        "is_urgent": false
      },
      {
        "title": "Healthy habits",
        "body": "Build lifelong habits now.",
        "bullets": [
          "Sit for meals without screens when possible",
          "Avoid constant grazing - keep snack times planned",
          "Model eating vegetables and fruits yourself"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 30 months ──
  (
    30,
    $json$[
      {
        "title": "Growing appetite and energy",
        "body": "Active toddlers need regular, nutrient-dense meals.",
        "bullets": [
          "Keep a regular meal and snack routine",
          "Offer protein at least once or twice daily (egg, beans, meat, dairy)",
          "Include colorful vegetables and fruits",
          "Limit fried and sugary street snacks"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 36 months (3 years) ──
  (
    36,
    $json$[
      {
        "title": "Preschool nutrition",
        "body": "Children need enough energy for play and learning, without excess sugar.",
        "bullets": [
          "3 balanced meals + 1-2 snacks",
          "Involve the child in simple food prep (washing fruit, stirring)",
          "Offer water instead of soft drinks",
          "Continue a variety of local staples and vegetables",
          "Watch portion sizes - child-sized plates help"
        ],
        "is_urgent": false
      },
      {
        "title": "Dental-friendly eating",
        "body": "Protect teeth while supporting growth.",
        "bullets": [
          "Limit sticky sweets between meals",
          "Brush teeth twice daily with a smear of fluoride toothpaste (as advised locally)",
          "Avoid putting a child to bed with a bottle of milk or juice"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 48 months (4 years) ──
  (
    48,
    $json$[
      {
        "title": "Active child meals",
        "body": "Support steady growth with regular, varied meals.",
        "bullets": [
          "Eat breakfast every day when possible",
          "Pack healthy snacks for outings (fruit, boiled egg, plain yogurt)",
          "Limit chips, sweets, and sugary drinks",
          "Encourage helping set the table or choose a fruit"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 60 months (5 years) ──
  (
    60,
    $json$[
      {
        "title": "School-age readiness",
        "body": "A good breakfast and balanced lunch support attention and energy.",
        "bullets": [
          "Prioritize breakfast before school or play",
          "Include protein + staple + fruit/vegetable across the day",
          "Keep sugary drinks rare",
          "Teach handwashing before meals"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 72 months (6 years) ──
  (
    72,
    $json$[
      {
        "title": "School-age nutrition",
        "body": "Children need enough food for growth, learning, and activity.",
        "bullets": [
          "3 meals + optional healthy snack",
          "Include iron-rich foods (meat, legumes, fortified grains)",
          "Limit ultra-processed snacks sold near schools",
          "Ensure clean drinking water is available"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 84 months (7 years) ──
  (
    84,
    $json$[
      {
        "title": "Steady growth",
        "body": "Keep meals regular and balanced as activity increases.",
        "bullets": [
          "Do not skip meals",
          "Offer fruits and vegetables daily",
          "Limit soft drinks and energy drinks",
          "Involve the child in planning simple meals"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  ),

  -- ── 96 months (8 years) ──
  (
    96,
    $json$[
      {
        "title": "Healthy habits for life",
        "body": "Family food patterns matter more than perfect single meals.",
        "bullets": [
          "Keep shared family meals when possible",
          "Balance staples with vegetables, legumes, and protein",
          "Limit sweets to special occasions",
          "Encourage water as the everyday drink",
          "Seek care if weight gain is very rapid or the child is losing weight"
        ],
        "is_urgent": false
      }
    ]$json$::jsonb
  )
) as v(age_months, nutrition)
  on p.age_months = v.age_months
where
  t.period_id = p.id
  and t.language_code = 'en';

-- Optional check: how many English rows got nutrition content
-- select p.age_months, p.age_label, jsonb_array_length(t.nutrition) as nutrition_sections
-- from public.child_growth_periods p
-- join public.child_growth_period_translations t on t.period_id = p.id and t.language_code = 'en'
-- order by p.age_months;
