import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BUCKET = "child-growth-learning-paths";

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

function storagePathFromUrl(imageUrl, bucket) {
  const marker = `/${bucket}/`;
  const index = imageUrl.indexOf(marker);
  if (index < 0) return null;
  return imageUrl.substring(index + marker.length).split("?")[0].split("#")[0];
}

function collectUrlsFromJson(node, acc = new Set()) {
  if (typeof node === "string") {
    if (node.includes("/storage/v1/object/public/")) acc.add(node.split("?")[0]);
    return acc;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectUrlsFromJson(item, acc);
    return acc;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) collectUrlsFromJson(value, acc);
  }
  return acc;
}

async function listAllFiles(sb, prefix = "") {
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`${prefix}: ${error.message}`);

  const files = [];
  for (const item of data ?? []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      files.push(itemPath);
      continue;
    }
    files.push(...(await listAllFiles(sb, itemPath)));
  }
  return files;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await sb
  .from("child_growth_period_translations")
  .select("milestones");
if (error) throw error;

const referenced = new Set();
for (const row of data ?? []) {
  for (const imageUrl of collectUrlsFromJson(row.milestones)) {
    const storagePath = storagePathFromUrl(imageUrl, BUCKET);
    if (storagePath) referenced.add(storagePath);
  }
}

const stored = await listAllFiles(sb);
const orphans = stored.filter((filePath) => !referenced.has(filePath));

if (!orphans.length) {
  console.log("No orphan learning-path images");
  process.exit(0);
}

console.log(`Deleting ${orphans.length} orphan learning-path images`);
for (let i = 0; i < orphans.length; i += 100) {
  const batch = orphans.slice(i, i + 100);
  const { error: removeError } = await sb.storage.from(BUCKET).remove(batch);
  if (removeError) throw new Error(removeError.message);
  for (const orphan of batch) console.log(`  deleted ${orphan}`);
}

console.log(`Done: deleted ${orphans.length} orphans, kept ${referenced.size} referenced`);
