/** Compose admin pregnancy lists from GET /admin/users + /users/{id}. */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  const out = String(value).trim();
  return out || fallback;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function profileSnippet(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    full_name: (row.full_name ?? row.fullName ?? null) as string | null,
    phone: (row.phone ?? null) as string | null,
  };
}

function mapPregnancyRow(
  row: Record<string, unknown>,
  profile: ReturnType<typeof profileSnippet>,
) {
  const conditionsRaw = row.conditions;
  const conditions = Array.isArray(conditionsRaw)
    ? conditionsRaw.map((item) => String(item))
    : [];
  return {
    id: str(row.id),
    user_id: str(row.user_id ?? row.userId),
    lmp_date: (row.lmp_date ?? row.lmpDate ?? null) as string | null,
    edd: (row.edd ?? null) as string | null,
    status: str(row.status, "active"),
    pregnancy_number: num(row.pregnancy_number ?? row.pregnancyNumber) ?? 1,
    is_first_pregnancy: Boolean(
      row.is_first_pregnancy ?? row.isFirstPregnancy ?? true,
    ),
    location: (row.location ?? null) as string | null,
    hospital: (row.hospital ?? null) as string | null,
    conditions,
    created_at: str(row.created_at ?? row.createdAt),
    completed_at: (row.completed_at ?? row.completedAt ?? null) as string | null,
    updated_at: str(row.updated_at ?? row.updatedAt),
    profiles: profile,
  };
}

function mapPregnancyLogRow(
  row: Record<string, unknown>,
  nest: {
    user_id: string;
    profiles: ReturnType<typeof profileSnippet>;
  },
) {
  const symptomsRaw = row.symptoms;
  const symptoms = Array.isArray(symptomsRaw)
    ? symptomsRaw.map((item) => String(item))
    : [];
  return {
    id: str(row.id),
    pregnancy_id: str(row.pregnancy_id ?? row.pregnancyId),
    week_number: num(row.week_number ?? row.weekNumber) ?? 0,
    weight: num(row.weight),
    height: num(row.height),
    blood_pressure_systolic: num(
      row.blood_pressure_systolic ?? row.bloodPressureSystolic,
    ),
    blood_pressure_diastolic: num(
      row.blood_pressure_diastolic ?? row.bloodPressureDiastolic,
    ),
    temperature: num(row.temperature),
    symptoms,
    notes: (row.notes ?? null) as string | null,
    created_at: str(row.created_at ?? row.createdAt),
    updated_at: str(row.updated_at ?? row.updatedAt),
    pregnancies: nest,
  };
}

function userRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isPlainObject);
  if (!isPlainObject(body)) return [];
  for (const key of ["profiles", "users", "items", "data"] as const) {
    const rows = body[key];
    if (Array.isArray(rows)) return rows.filter(isPlainObject);
  }
  return [];
}

function detailProfile(body: Record<string, unknown>): Record<string, unknown> {
  if (isPlainObject(body.profile)) return body.profile;
  if (isPlainObject(body.user)) return body.user;
  return body;
}

function detailPregnancies(body: Record<string, unknown>): Record<string, unknown>[] {
  const rows = body.pregnancies;
  return Array.isArray(rows) ? rows.filter(isPlainObject) : [];
}

function detailLogs(
  body: Record<string, unknown>,
): Record<string, Record<string, unknown>[]> {
  const byKey =
    body.logsByPregnancy ??
    body.logs_by_pregnancy ??
    body.pregnancy_logs_by_id;
  if (isPlainObject(byKey)) {
    const out: Record<string, Record<string, unknown>[]> = {};
    for (const [key, value] of Object.entries(byKey)) {
      if (Array.isArray(value)) out[key] = value.filter(isPlainObject);
    }
    return out;
  }
  const flat =
    body.pregnancy_logs ?? body.pregnancyLogs ?? body.logs ?? body.health_logs;
  if (!Array.isArray(flat)) return {};
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const row of flat.filter(isPlainObject)) {
    const pregnancyId = str(row.pregnancy_id ?? row.pregnancyId);
    if (!pregnancyId) continue;
    out[pregnancyId] ??= [];
    out[pregnancyId].push(row);
  }
  return out;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index] as T);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export type ComposedPregnancyLists = {
  pregnancies: ReturnType<typeof mapPregnancyRow>[];
  logs: ReturnType<typeof mapPregnancyLogRow>[];
};

// ponytail: N+1 users→detail until OpenAPI adds GET /admin/pregnancies (+ logs)
const USER_PAGE_SIZE = 100;
const USER_PAGE_CAP = 20;
const DETAIL_CONCURRENCY = 8;

export async function composePregnancyListsFromUsers(input: {
  baseUrl: string;
  token: string;
}): Promise<ComposedPregnancyLists> {
  const headers = { Authorization: `Bearer ${input.token}` };
  const users: Record<string, unknown>[] = [];

  for (let page = 0; page < USER_PAGE_CAP; page += 1) {
    const offset = page * USER_PAGE_SIZE;
    const url = `${input.baseUrl}/api/v1/admin/users?limit=${USER_PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        text || `Failed to list users (${response.status}) for pregnancies`,
      );
    }
    const body = (await response.json()) as unknown;
    const rows = userRows(body);
    users.push(...rows);
    if (rows.length < USER_PAGE_SIZE) break;
  }

  const pregnancies: ComposedPregnancyLists["pregnancies"] = [];
  const logs: ComposedPregnancyLists["logs"] = [];

  await mapPool(users, DETAIL_CONCURRENCY, async (user) => {
    const userId = str(user.id);
    if (!userId) return;
    const detailRes = await fetch(
      `${input.baseUrl}/api/v1/admin/users/${userId}`,
      { headers, cache: "no-store" },
    );
    if (!detailRes.ok) return;
    const detailBody = (await detailRes.json()) as unknown;
    if (!isPlainObject(detailBody)) return;

    const profile = profileSnippet(detailProfile(detailBody));
    const nest = { user_id: userId, profiles: profile };
    const logsByPregnancy = detailLogs(detailBody);

    for (const row of detailPregnancies(detailBody)) {
      const mapped = mapPregnancyRow(
        {
          ...row,
          user_id: row.user_id ?? row.userId ?? userId,
        },
        profile,
      );
      pregnancies.push(mapped);
      const pregnancyLogs = logsByPregnancy[mapped.id] ?? [];
      for (const log of pregnancyLogs) {
        logs.push(mapPregnancyLogRow(log, nest));
      }
    }

    // Logs keyed to pregnancies not in the pregnancies array
    for (const [pregnancyId, pregnancyLogs] of Object.entries(logsByPregnancy)) {
      if (pregnancies.some((p) => p.id === pregnancyId)) continue;
      for (const log of pregnancyLogs) {
        logs.push(mapPregnancyLogRow(log, nest));
      }
    }
  });

  pregnancies.sort((a, b) => {
    const aAt = a.updated_at || a.created_at;
    const bAt = b.updated_at || b.created_at;
    return bAt.localeCompare(aAt);
  });
  logs.sort((a, b) => b.week_number - a.week_number);

  return { pregnancies, logs };
}

export function groupLogsByPregnancy(
  logs: ReturnType<typeof mapPregnancyLogRow>[],
): Record<string, ReturnType<typeof mapPregnancyLogRow>[]> {
  const out: Record<string, ReturnType<typeof mapPregnancyLogRow>[]> = {};
  for (const log of logs) {
    const key = log.pregnancy_id;
    if (!key) continue;
    out[key] ??= [];
    out[key].push(log);
  }
  return out;
}
