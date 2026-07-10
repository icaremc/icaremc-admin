-- Seed child growth timeline checkpoints 0-8 years (WHO growth medians + CDC developmental milestones).
-- Safe to re-run: upserts on age_months and (period_id, language_code).
-- Run in Supabase SQL editor or via `supabase db push`.

-- ── 1) Age periods + WHO median growth_metrics (boys/girls, ~3rd-97th min/max) ──

insert into public.child_growth_periods (age_months, age_label, age_group, growth_metrics, is_published)
values
  (0,  'Newborn',  'newborn', '{"boys":{"weight_kg":3.3,"weight_min":2.5,"weight_max":4.3,"height_cm":49.9,"height_min":46.3,"height_max":53.4,"hc_cm":34.5,"hc_min":32.1,"hc_max":36.9},"girls":{"weight_kg":3.2,"weight_min":2.4,"weight_max":4.2,"height_cm":49.1,"height_min":45.6,"height_max":52.7,"hc_cm":33.9,"hc_min":31.5,"hc_max":36.2}}'::jsonb, true),
  (1,  '6 weeks',  'newborn', '{"boys":{"weight_kg":4.5,"weight_min":3.4,"weight_max":5.8,"height_cm":54.0,"height_min":50.5,"height_max":57.6,"hc_cm":37.0,"hc_min":34.5,"hc_max":39.5},"girls":{"weight_kg":4.2,"weight_min":3.2,"weight_max":5.5,"height_cm":53.0,"height_min":49.5,"height_max":56.6,"hc_cm":36.2,"hc_min":33.8,"hc_max":38.7}}'::jsonb, true),
  (2,  '2 months', 'infant',  '{"boys":{"weight_kg":5.6,"weight_min":4.4,"weight_max":7.0,"height_cm":57.1,"height_min":54.0,"height_max":61.0,"hc_cm":39.1,"hc_min":36.9,"hc_max":41.3},"girls":{"weight_kg":5.1,"weight_min":4.0,"weight_max":6.5,"height_cm":55.7,"height_min":52.5,"height_max":59.5,"hc_cm":38.3,"hc_min":36.1,"hc_max":40.5}}'::jsonb, true),
  (4,  '4 months', 'infant',  '{"boys":{"weight_kg":6.4,"weight_min":5.1,"weight_max":8.0,"height_cm":62.1,"height_min":58.5,"height_max":66.0,"hc_cm":41.0,"hc_min":38.5,"hc_max":43.5},"girls":{"weight_kg":5.8,"weight_min":4.6,"weight_max":7.3,"height_cm":60.5,"height_min":57.0,"height_max":64.5,"hc_cm":40.0,"hc_min":37.5,"hc_max":42.5}}'::jsonb, true),
  (6,  '6 months', 'infant',  '{"boys":{"weight_kg":7.3,"weight_min":5.8,"weight_max":9.2,"height_cm":65.7,"height_min":62.0,"height_max":70.0,"hc_cm":42.6,"hc_min":40.0,"hc_max":45.2},"girls":{"weight_kg":6.7,"weight_min":5.3,"weight_max":8.5,"height_cm":64.0,"height_min":60.5,"height_max":68.5,"hc_cm":41.5,"hc_min":39.0,"hc_max":44.0}}'::jsonb, true),
  (9,  '9 months', 'infant',  '{"boys":{"weight_kg":8.2,"weight_min":6.5,"weight_max":10.3,"height_cm":69.4,"height_min":65.5,"height_max":73.5,"hc_cm":44.0,"hc_min":41.5,"hc_max":46.5},"girls":{"weight_kg":7.6,"weight_min":6.0,"weight_max":9.6,"height_cm":67.7,"height_min":64.0,"height_max":72.0,"hc_cm":43.0,"hc_min":40.5,"hc_max":45.5}}'::jsonb, true),
  (12, '12 months','infant',  '{"boys":{"weight_kg":8.9,"weight_min":7.0,"weight_max":11.2,"height_cm":72.3,"height_min":68.5,"height_max":76.5,"hc_cm":45.0,"hc_min":42.5,"hc_max":47.5},"girls":{"weight_kg":8.2,"weight_min":6.5,"weight_max":10.4,"height_cm":70.7,"height_min":67.0,"height_max":75.0,"hc_cm":44.0,"hc_min":41.5,"hc_max":46.5}}'::jsonb, true),
  (15, '15 months','toddler', '{"boys":{"weight_kg":9.4,"weight_min":7.5,"weight_max":11.8,"height_cm":74.8,"height_min":71.0,"height_max":79.0,"hc_cm":45.6,"hc_min":43.0,"hc_max":48.2},"girls":{"weight_kg":8.8,"weight_min":7.0,"weight_max":11.2,"height_cm":73.0,"height_min":69.5,"height_max":77.0,"hc_cm":44.5,"hc_min":42.0,"hc_max":47.0}}'::jsonb, true),
  (18, '18 months','toddler', '{"boys":{"weight_kg":10.2,"weight_min":8.1,"weight_max":12.8,"height_cm":77.5,"height_min":73.5,"height_max":82.0,"hc_cm":46.2,"hc_min":43.5,"hc_max":48.8},"girls":{"weight_kg":9.4,"weight_min":7.5,"weight_max":12.0,"height_cm":75.7,"height_min":72.0,"height_max":80.0,"hc_cm":45.1,"hc_min":42.5,"hc_max":47.8}}'::jsonb, true),
  (24, '2 years',  'toddler', '{"boys":{"weight_kg":12.0,"weight_min":9.5,"weight_max":15.0,"height_cm":85.1,"height_min":81.0,"height_max":90.0,"hc_cm":47.5,"hc_min":45.0,"hc_max":50.0},"girls":{"weight_kg":11.0,"weight_min":8.8,"weight_max":13.8,"height_cm":83.6,"height_min":79.5,"height_max":88.5,"hc_cm":46.5,"hc_min":44.0,"hc_max":49.0}}'::jsonb, true),
  (30, '30 months','toddler', '{"boys":{"weight_kg":13.3,"weight_min":10.5,"weight_max":16.8,"height_cm":89.5,"height_min":85.0,"height_max":94.5,"hc_cm":48.2,"hc_min":45.5,"hc_max":50.8},"girls":{"weight_kg":12.3,"weight_min":9.8,"weight_max":15.5,"height_cm":88.0,"height_min":83.5,"height_max":93.0,"hc_cm":47.2,"hc_min":44.5,"hc_max":49.8}}'::jsonb, true),
  (36, '3 years',  'toddler', '{"boys":{"weight_kg":14.3,"weight_min":11.3,"weight_max":18.0,"height_cm":93.9,"height_min":89.0,"height_max":99.0,"hc_cm":48.8,"hc_min":46.0,"hc_max":51.5},"girls":{"weight_kg":13.4,"weight_min":10.6,"weight_max":17.0,"height_cm":92.4,"height_min":87.5,"height_max":97.5,"hc_cm":47.8,"hc_min":45.0,"hc_max":50.5}}'::jsonb, true),
  (48, '4 years',  'child',   '{"boys":{"weight_kg":16.3,"weight_min":13.0,"weight_max":20.5,"height_cm":102.3,"height_min":97.0,"height_max":108.0,"hc_cm":49.5,"hc_min":47.0,"hc_max":52.0},"girls":{"weight_kg":15.7,"weight_min":12.5,"weight_max":19.8,"height_cm":100.8,"height_min":95.5,"height_max":106.5,"hc_cm":48.5,"hc_min":46.0,"hc_max":51.0}}'::jsonb, true),
  (60, '5 years',  'child',   '{"boys":{"weight_kg":18.3,"weight_min":14.5,"weight_max":23.0,"height_cm":109.9,"height_min":104.5,"height_max":115.5,"hc_cm":50.0,"hc_min":47.5,"hc_max":52.5},"girls":{"weight_kg":17.7,"weight_min":14.0,"weight_max":22.5,"height_cm":108.4,"height_min":103.0,"height_max":114.0,"hc_cm":49.0,"hc_min":46.5,"hc_max":51.5}}'::jsonb, true),
  (72, '6 years',  'child',   '{"boys":{"weight_kg":20.7,"weight_min":16.5,"weight_max":26.0,"height_cm":116.5,"height_min":111.0,"height_max":122.5,"hc_cm":50.5,"hc_min":48.0,"hc_max":53.0},"girls":{"weight_kg":20.0,"weight_min":16.0,"weight_max":25.5,"height_cm":115.5,"height_min":110.0,"height_max":121.5,"hc_cm":49.5,"hc_min":47.0,"hc_max":52.0}}'::jsonb, true),
  (84, '7 years',  'child',   '{"boys":{"weight_kg":23.6,"weight_min":18.5,"weight_max":30.0,"height_cm":122.5,"height_min":116.5,"height_max":128.5,"hc_cm":51.0,"hc_min":48.5,"hc_max":53.5},"girls":{"weight_kg":22.8,"weight_min":18.0,"weight_max":29.5,"height_cm":121.5,"height_min":115.5,"height_max":127.5,"hc_cm":50.0,"hc_min":47.5,"hc_max":52.5}}'::jsonb, true),
  (96, '8 years',  'child',   '{"boys":{"weight_kg":26.5,"weight_min":21.0,"weight_max":34.0,"height_cm":128.0,"height_min":122.0,"height_max":134.5,"hc_cm":51.5,"hc_min":49.0,"hc_max":54.0},"girls":{"weight_kg":25.9,"weight_min":20.5,"weight_max":33.5,"height_cm":127.0,"height_min":121.0,"height_max":133.5,"hc_cm":50.5,"hc_min":48.0,"hc_max":53.0}}'::jsonb, true)
on conflict (age_months) do update set
  age_label = excluded.age_label,
  age_group = excluded.age_group,
  growth_metrics = excluded.growth_metrics,
  is_published = excluded.is_published,
  updated_at = now();

-- ── 2) English translations: checklist (milestones) + red flags ──

insert into public.child_growth_period_translations
  (period_id, language_code, title, subtitle, growth, vaccines, milestones, red_flags, nutrition, visit_reminders)
select p.id, 'en', v.title, v.subtitle, '{}'::jsonb, '[]'::jsonb, v.milestones, v.red_flags, '[]'::jsonb, '[]'::jsonb
from public.child_growth_periods p
join (values
  (0, 'Newborn', null::text,
   '[{"title":"Communication","items":[{"label":"Startles or cries at loud sounds"},{"label":"Makes brief eye contact with faces"}]},{"title":"Movement","items":[{"label":"Moves arms and legs on both sides"},{"label":"Turns head side to side when lying on back"}]},{"title":"Feeding & care","items":[{"label":"Feeds every 2-3 hours (8+ times in 24 hours)"},{"label":"Has 6+ wet nappies per day by day 5"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Fever (38°C or higher) in first 3 months"},{"label":"Difficulty breathing, grunting, or blue lips"},{"label":"Will not wake for feeds or is too weak to suck"}]}]'::jsonb),

  (1, '6 weeks', null,
   '[{"title":"Communication","items":[{"label":"Makes brief cooing or gurgling sounds"},{"label":"Calms when spoken to or picked up"}]},{"title":"Movement","items":[{"label":"Lifts head briefly when on tummy"},{"label":"Follows a face or object with eyes"}]},{"title":"Social","items":[{"label":"Begins to smile at people"},{"label":"Looks at parent during feeding"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"No social smile by 8 weeks"},{"label":"Does not follow objects or faces with eyes"},{"label":"Very stiff or very floppy body"}]}]'::jsonb),

  (2, '2 months', null,
   '[{"title":"Communication (speech & language)","items":[{"label":"Makes sounds other than crying"},{"label":"Responds to loud noises"}]},{"title":"Cognitive & early learning","items":[{"label":"Sees you moving"},{"label":"Looks at objects for several seconds"}]},{"title":"Physical movement","items":[{"label":"Lifts head when lying on stomach"},{"label":"Lifts both arms and legs"},{"label":"Opens hands spontaneously"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Does not respond to loud sounds"},{"label":"Does not watch things as they move"},{"label":"Cannot hold head up when on tummy"}]}]'::jsonb),

  (4, '4 months', null,
   '[{"title":"Communication (speech & language)","items":[{"label":"Makes cooing sounds like \"oooo\" and \"aahh\""},{"label":"Responds with sounds when you talk"},{"label":"Turns toward your voice"}]},{"title":"Cognitive & early learning","items":[{"label":"Opens mouth when seeing breast or bottle when hungry"},{"label":"Looks at hands with curiosity"}]},{"title":"Physical movement","items":[{"label":"Holds head steadily without support when held"},{"label":"Holds a toy placed in their hand"},{"label":"Pushes up on elbows when on stomach"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Does not coo or make sounds"},{"label":"Does not bring hands to mouth"},{"label":"Head still flops back when pulled to sit"}]}]'::jsonb),

  (6, '6 months', null,
   '[{"title":"Communication (speech & language)","items":[{"label":"Takes turns making sounds with you"},{"label":"Recognizes familiar faces and responds to emotions"},{"label":"Laughs and shows affection"}]},{"title":"Cognitive & early learning","items":[{"label":"Puts objects in mouth to explore"},{"label":"Reaches for someone to pick up a wanted toy"}]},{"title":"Physical movement","items":[{"label":"Rolls from stomach to back"},{"label":"Pushes up on arms while on stomach"},{"label":"Leans on hands for support while sitting"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Does not try to reach for toys"},{"label":"Shows no affection for caregivers"},{"label":"Very stiff or very floppy muscles"}]}]'::jsonb),

  (9, '9 months', null,
   '[{"title":"Communication (speech & language)","items":[{"label":"Says sounds like \"mamamama\" and \"babababa\""},{"label":"Stretches arms to be picked up"}]},{"title":"Cognitive & early learning","items":[{"label":"Looks for hidden objects (e.g. spoon or toy)"},{"label":"Bangs two objects together"}]},{"title":"Physical movement","items":[{"label":"Gets into sitting alone"},{"label":"Moves objects from one hand to the other"},{"label":"Sits without support and crawls"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Does not bear weight on legs with support"},{"label":"Does not sit without help"},{"label":"Does not respond to own name"}]}]'::jsonb),

  (12, '12 months', null,
   '[{"title":"Communication (speech & language)","items":[{"label":"Waves to say goodbye"},{"label":"Calls a parent \"mama\" or \"dada\""},{"label":"Understands \"no\" - pauses when told no"}]},{"title":"Cognitive & early learning","items":[{"label":"Puts something in a container"},{"label":"Looks for what you hide under a blanket"}]},{"title":"Physical movement","items":[{"label":"Walks with support"},{"label":"Drinks from a cup without a lid"},{"label":"Picks up small objects with thumb and finger"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Does not crawl"},{"label":"Cannot stand when supported"},{"label":"Does not point to things"}]}]'::jsonb),

  (15, '15 months', null,
   '[{"title":"Social / emotional","items":[{"label":"Copies other children while playing"},{"label":"Shows you an object they like"},{"label":"Shows affection (hugs, cuddles, or kisses)"}]},{"title":"Language / communication","items":[{"label":"Tries to say one or two words besides \"mama\" or \"dada\""},{"label":"Points to ask for something or to get help"}]},{"title":"Movement / physical","items":[{"label":"Takes a few steps on their own"},{"label":"Uses fingers to feed themselves some food"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Does not walk at all"},{"label":"Says no words"},{"label":"Loss of skills they once had"}]}]'::jsonb),

  (18, '18 months', 'Developmental screening is recommended at this visit.',
   '[{"title":"Social / emotional","items":[{"label":"Points to show you something interesting"},{"label":"Looks at a few pages in a book with you"},{"label":"Helps you dress them by pushing arm through a sleeve"}]},{"title":"Language / communication","items":[{"label":"Tries to say three or more words besides \"mama\" or \"dada\""},{"label":"Follows one-step directions without gestures"}]},{"title":"Movement / physical","items":[{"label":"Walks without holding on"},{"label":"Scribbles"},{"label":"Climbs on and off a couch or chair without help"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Does not point to show things"},{"label":"Does not know what familiar things are for"},{"label":"Does not copy others"}]}]'::jsonb),

  (24, '2 years', 'Autism screening is recommended at this visit.',
   '[{"title":"Social / emotional","items":[{"label":"Notices when others are hurt or upset"},{"label":"Looks at your face to see how to react in a new situation"}]},{"title":"Language / communication","items":[{"label":"Points to things in a book when you ask"},{"label":"Says at least two words together, like \"More milk\""},{"label":"Points to at least two body parts when you ask"}]},{"title":"Movement / physical","items":[{"label":"Kicks a ball"},{"label":"Runs"},{"label":"Eats with a spoon"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Does not use two-word phrases"},{"label":"Does not know how to use common objects"},{"label":"Does not copy actions or words"}]}]'::jsonb),

  (30, '30 months', 'Developmental screening is recommended at this visit.',
   '[{"title":"Social / emotional","items":[{"label":"Plays next to other children and sometimes with them"},{"label":"Shows you what they can do, saying \"Look at me!\""}]},{"title":"Language / communication","items":[{"label":"Says about 50 words"},{"label":"Says two or more words together with an action word"},{"label":"Says words like \"I\", \"me\", or \"we\""}]},{"title":"Movement / physical","items":[{"label":"Jumps off the ground with both feet"},{"label":"Turns book pages one at a time"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Vocabulary fewer than 25 words"},{"label":"Does not follow simple instructions"},{"label":"Frequent falls or very clumsy compared to peers"}]}]'::jsonb),

  (36, '3 years', null,
   '[{"title":"Social / emotional","items":[{"label":"Calms down within 10 minutes after you leave"},{"label":"Notices other children and joins them to play"}]},{"title":"Language / communication","items":[{"label":"Talks with you using at least two back-and-forth exchanges"},{"label":"Asks \"who\", \"what\", \"where\", or \"why\" questions"},{"label":"Says their first name when asked"}]},{"title":"Movement / physical","items":[{"label":"Strings items together, like large beads"},{"label":"Puts on some clothes by themselves"},{"label":"Uses a fork"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Speech is hard to understand most of the time"},{"label":"Does not make eye contact"},{"label":"Cannot stack at least 4 blocks"}]}]'::jsonb),

  (48, '4 years', null,
   '[{"title":"Social / emotional","items":[{"label":"Pretends to be something else during play"},{"label":"Comforts others who are hurt or sad"},{"label":"Likes to be a \"helper\""}]},{"title":"Language / communication","items":[{"label":"Says sentences with four or more words"},{"label":"Talks about at least one thing that happened during their day"}]},{"title":"Cognitive","items":[{"label":"Names a few colors of items"},{"label":"Draws a person with three or more body parts"}]},{"title":"Movement / physical","items":[{"label":"Catches a large ball most of the time"},{"label":"Holds a crayon between fingers and thumb (not a fist)"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Cannot jump with both feet off the ground"},{"label":"Does not understand simple \"same\" and \"different\""},{"label":"Ignores other children or does not respond to people outside the family"}]}]'::jsonb),

  (60, '5 years', null,
   '[{"title":"Social / emotional","items":[{"label":"Follows rules or takes turns when playing games"},{"label":"Sings, dances, or acts for you"},{"label":"Does simple chores at home"}]},{"title":"Language / communication","items":[{"label":"Tells a story with at least two events"},{"label":"Keeps a conversation going with more than three back-and-forth exchanges"}]},{"title":"Cognitive","items":[{"label":"Counts to 10"},{"label":"Writes some letters in their name"}]},{"title":"Movement / physical","items":[{"label":"Buttons some buttons"},{"label":"Hops on one foot"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Cannot tell a simple story"},{"label":"Does not play a variety of games"},{"label":"Extreme fear or behaviour that hurts self or others"}]}]'::jsonb),

  (72, '6 years', null,
   '[{"title":"Social / emotional","items":[{"label":"Wants to please friends and be like them"},{"label":"Shows more independence"},{"label":"Is aware of gender"}]},{"title":"Language / communication","items":[{"label":"Speaks in full sentences"},{"label":"Can tell a simple story with a beginning, middle, and end"},{"label":"Follows multi-step directions"}]},{"title":"Cognitive","items":[{"label":"Can count to 20 and beyond"},{"label":"Knows about left and right"},{"label":"Can print some letters and numbers"}]},{"title":"Movement / physical","items":[{"label":"Can hop and skip"},{"label":"Catches a ball with hands"},{"label":"Can ride a bicycle with training wheels"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Cannot follow simple classroom rules"},{"label":"Speech is still very hard to understand"},{"label":"Extreme difficulty separating from parents"}]}]'::jsonb),

  (84, '7 years', null,
   '[{"title":"Social / emotional","items":[{"label":"Cooperates with other children"},{"label":"May have a best friend"},{"label":"Shows concern for others"}]},{"title":"Language / communication","items":[{"label":"Reads simple books"},{"label":"Spells simple words"},{"label":"Uses complete sentences in conversation"}]},{"title":"Cognitive","items":[{"label":"Understands time concepts (today, tomorrow, yesterday)"},{"label":"Can add and subtract simple numbers"},{"label":"Can copy complex shapes like a diamond"}]},{"title":"Movement / physical","items":[{"label":"Rides a bicycle"},{"label":"Ties shoelaces (may need help)"},{"label":"Good balance when running and turning"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Cannot read simple words appropriate for age"},{"label":"Persistent trouble paying attention that affects daily life"},{"label":"Frequent nightmares or extreme anxiety"}]}]'::jsonb),

  (96, '8 years', null,
   '[{"title":"Social / emotional","items":[{"label":"Enjoys group activities and team games"},{"label":"Follows rules in games with peers"},{"label":"Shows pride in achievements"}]},{"title":"Language / communication","items":[{"label":"Reads chapter books"},{"label":"Writes simple stories or journal entries"},{"label":"Uses correct grammar most of the time"}]},{"title":"Cognitive","items":[{"label":"Understands cause and effect"},{"label":"Solves simple math word problems"},{"label":"Can tell time on a clock"}]},{"title":"Movement / physical","items":[{"label":"Good coordination for sports"},{"label":"Fine motor skills for writing and drawing"},{"label":"Can swim or ride a bike without training wheels"}]}]'::jsonb,
   '[{"title":"Seek care urgently","items":[{"label":"Significant regression in reading or writing skills"},{"label":"Persistent bullying or social isolation causing distress"},{"label":"Signs of depression or self-harm"}]}]'::jsonb)

) as v(age_months, title, subtitle, milestones, red_flags)
  on p.age_months = v.age_months
on conflict (period_id, language_code) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  milestones = excluded.milestones,
  red_flags = excluded.red_flags,
  updated_at = now();
