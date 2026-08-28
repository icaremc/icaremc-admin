import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const map = JSON.parse(
  fs.readFileSync(path.join(root, "supabase/seeds/child-growth-am-om-map.json"), "utf8"),
);

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function translateValue(value, locale) {
  if (typeof value === "string") {
    const hit = map[value];
    return hit?.[locale] ?? value;
  }
  if (Array.isArray(value)) return value.map((item) => translateValue(item, locale));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] =
        key === "image_url" || key === "image_urls"
          ? nested
          : translateValue(nested, locale);
    }
    return out;
  }
  return value;
}

function leftoverEnglish(node, acc = []) {
  if (typeof node === "string") {
    if (/[A-Za-z]{4,}/.test(node) && !/Tanner|mama|dada|IU|cm|mg|Stage/.test(node)) {
      acc.push(node.slice(0, 80));
    }
    return acc;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => leftoverEnglish(item, acc));
    return acc;
  }
  if (node && typeof node === "object") {
    for (const [key, nested] of Object.entries(node)) {
      if (key === "image_url" || key === "image_urls") continue;
      leftoverEnglish(nested, acc);
    }
  }
  return acc;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

const periods = await fetch(
  `${url}/rest/v1/child_growth_periods?select=id,age_months,age_label,child_growth_period_translations(language_code,title,subtitle,growth,vaccines,milestones,red_flags,nutrition,visit_reminders)&order=age_months.asc`,
  { headers },
).then(async (res) => {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
});

const rows = [];
const leftovers = [];

for (const period of periods) {
  if (period.age_months < 15) continue;
  const en = period.child_growth_period_translations.find(
    (row) => row.language_code === "en",
  );
  if (!en) throw new Error(`No English row for ${period.age_months}`);

  for (const locale of ["am", "om"]) {
    const title = translateValue(en.title, locale);
    const subtitle = en.subtitle ? translateValue(en.subtitle, locale) : null;
    const milestones = translateValue(en.milestones, locale);
    const red_flags = translateValue(en.red_flags, locale);
    const nutrition = translateValue(en.nutrition, locale);
    leftovers.push(
      ...leftoverEnglish({ title, subtitle, milestones, red_flags, nutrition }).map(
        (text) => `${period.age_months} ${locale}: ${text}`,
      ),
    );
    rows.push({
      period_id: period.id,
      language_code: locale,
      title,
      subtitle,
      growth: en.growth ?? {},
      vaccines: [],
      milestones,
      red_flags,
      nutrition,
      visit_reminders: [],
    });
  }
}

const res = await fetch(
  `${url}/rest/v1/child_growth_period_translations?on_conflict=period_id,language_code`,
  { method: "POST", headers, body: JSON.stringify(rows) },
);
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

console.log(`upserted ${rows.length} rows (${rows.length / 2} periods × am/om)`);
if (leftovers.length) {
  console.log("possible leftover English", leftovers.length);
  console.log(leftovers.slice(0, 20).join("\n"));
}
