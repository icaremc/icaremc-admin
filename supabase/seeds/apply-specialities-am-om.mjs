import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const map = JSON.parse(
  fs.readFileSync(path.join(root, "supabase/seeds/specialities-am-om-map.json"), "utf8"),
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

const categories = await fetch(
  `${url}/rest/v1/doctor_categories?select=id,name,doctor_category_translations(language_code,name)&order=sort_order.asc`,
  { headers },
).then(async (res) => {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
});

const rows = [];
const missing = [];

for (const category of categories) {
  const en =
    category.doctor_category_translations.find((row) => row.language_code === "en")
      ?.name ?? category.name;
  const hit = map[en];
  if (!hit) {
    missing.push(en);
    continue;
  }
  for (const locale of ["am", "om"]) {
    rows.push({
      category_id: category.id,
      language_code: locale,
      name: hit[locale],
    });
  }
}

if (missing.length) {
  throw new Error(`No map entry for: ${missing.join(" | ")}`);
}

const res = await fetch(
  `${url}/rest/v1/doctor_category_translations?on_conflict=category_id,language_code`,
  { method: "POST", headers, body: JSON.stringify(rows) },
);
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

console.log(`upserted ${rows.length} rows (${categories.length} specialities × am/om)`);
