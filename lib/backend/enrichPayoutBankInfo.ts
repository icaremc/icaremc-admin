// ponytail: one list fetch (limit 500); switch to per-id/doctor_id filters if catalogs grow

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function nestedMethod(row: Record<string, unknown>): Record<string, unknown> | null {
  if (isPlainObject(row.payout_method)) return row.payout_method;
  if (isPlainObject(row.payoutMethod)) return row.payoutMethod;
  if (isPlainObject(row.doctor_payout_methods)) return row.doctor_payout_methods;
  if (isPlainObject(row.payment_method)) return row.payment_method;
  if (isPlainObject(row.paymentMethod)) return row.paymentMethod;
  return null;
}

function hasBankDetails(method: Record<string, unknown> | null): boolean {
  if (!method) return false;
  return Boolean(
    str(method.account_number ?? method.accountNumber) ||
      str(method.bank_name ?? method.bankName) ||
      str(method.holder_name ?? method.holderName),
  );
}

function methodOwnerIds(method: Record<string, unknown>): {
  id: string;
  doctorId: string;
  patientId: string;
  userId: string;
} {
  return {
    id: str(method.id),
    doctorId: str(method.doctor_id ?? method.doctorId),
    patientId: str(method.patient_id ?? method.patientId),
    userId: str(method.user_id ?? method.userId),
  };
}

function pickForOwner(
  methods: Record<string, unknown>[],
  opts: { methodId?: string; doctorId?: string; patientId?: string; userId?: string },
): Record<string, unknown> | null {
  if (opts.methodId) {
    const byId = methods.find((m) => methodOwnerIds(m).id === opts.methodId);
    if (byId) return byId;
  }

  const pool = methods.filter((m) => {
    const ids = methodOwnerIds(m);
    if (opts.doctorId && ids.doctorId === opts.doctorId) return true;
    if (opts.patientId && ids.patientId === opts.patientId) return true;
    if (opts.userId && ids.userId === opts.userId) return true;
    return false;
  });
  if (pool.length === 0) return null;

  const preferred =
    pool.find((m) => Boolean(m.is_default ?? m.isDefault)) ??
    pool.find((m) => m.is_active !== false && m.isActive !== false) ??
    pool[0];
  return preferred ?? null;
}

async function fetchMethodList(
  baseUrl: string,
  token: string,
  apiPath: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>[]> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}${apiPath}`);
  url.searchParams.set("limit", "500");
  try {
    const res = await fetchImpl(url.href, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body: unknown = await res.json();
    if (Array.isArray(body)) return body.filter(isPlainObject);
    if (isPlainObject(body) && Array.isArray(body.items)) {
      return body.items.filter(isPlainObject);
    }
    if (isPlainObject(body) && Array.isArray(body.methods)) {
      return body.methods.filter(isPlainObject);
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchMethodById(
  baseUrl: string,
  token: string,
  apiPath: string,
  id: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown> | null> {
  if (!id) return null;
  const url = `${baseUrl.replace(/\/$/, "")}${apiPath}/${encodeURIComponent(id)}`;
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (isPlainObject(body)) {
      if (isPlainObject(body.method)) return body.method;
      return body;
    }
    return null;
  } catch {
    return null;
  }
}

function listRows(body: unknown): {
  rows: Record<string, unknown>[];
  wrap: (rows: Record<string, unknown>[]) => unknown;
} {
  if (Array.isArray(body)) {
    return {
      rows: body.filter(isPlainObject),
      wrap: (rows) => rows,
    };
  }
  if (isPlainObject(body) && Array.isArray(body.requests)) {
    return {
      rows: body.requests.filter(isPlainObject),
      wrap: (rows) => ({ ...body, requests: rows }),
    };
  }
  return { rows: [], wrap: () => body };
}

function attachMethod(
  row: Record<string, unknown>,
  method: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...row,
    payout_method: method,
    payout_method_id:
      str(row.payout_method_id ?? row.payoutMethodId) || str(method.id) || null,
  };
}

async function enrichDoctorRows(
  rows: Record<string, unknown>[],
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>[]> {
  const needing = rows.filter((row) => !hasBankDetails(nestedMethod(row)));
  if (needing.length === 0) return rows;

  const methods = await fetchMethodList(
    baseUrl,
    token,
    "/api/v1/admin/payout-methods",
    fetchImpl,
  );

  return Promise.all(
    rows.map(async (row) => {
      if (hasBankDetails(nestedMethod(row))) return row;
      const methodId = str(row.payout_method_id ?? row.payoutMethodId);
      const doctorId = str(row.doctor_id ?? row.doctorId);
      let method = pickForOwner(methods, { methodId, doctorId });
      if (!method && methodId) {
        method = await fetchMethodById(
          baseUrl,
          token,
          "/api/v1/admin/payout-methods",
          methodId,
          fetchImpl,
        );
      }
      return method && hasBankDetails(method) ? attachMethod(row, method) : row;
    }),
  );
}

async function enrichPatientRows(
  rows: Record<string, unknown>[],
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>[]> {
  const needing = rows.filter((row) => !hasBankDetails(nestedMethod(row)));
  if (needing.length === 0) return rows;

  const [paymentMethods, payoutMethods] = await Promise.all([
    fetchMethodList(baseUrl, token, "/api/v1/admin/payment-methods", fetchImpl),
    fetchMethodList(baseUrl, token, "/api/v1/admin/payout-methods", fetchImpl),
  ]);
  const methods = [...paymentMethods, ...payoutMethods];

  return Promise.all(
    rows.map(async (row) => {
      if (hasBankDetails(nestedMethod(row))) return row;
      const methodId = str(row.payout_method_id ?? row.payoutMethodId);
      const patientId = str(row.patient_id ?? row.patientId);
      const userId = str(row.user_id ?? row.userId);
      let method = pickForOwner(methods, { methodId, patientId, userId });
      if (!method && methodId) {
        method =
          (await fetchMethodById(
            baseUrl,
            token,
            "/api/v1/admin/payment-methods",
            methodId,
            fetchImpl,
          )) ??
          (await fetchMethodById(
            baseUrl,
            token,
            "/api/v1/admin/payout-methods",
            methodId,
            fetchImpl,
          ));
      }
      return method && hasBankDetails(method) ? attachMethod(row, method) : row;
    }),
  );
}

export async function enrichPayoutBankInfo(
  adminPath: string,
  method: string,
  body: unknown,
  options: {
    baseUrl: string;
    token: string;
    fetchImpl?: typeof fetch;
  },
): Promise<unknown> {
  if (method.toUpperCase() !== "GET") return body;

  const path = adminPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);
  const head = segments[0] ?? "";
  const rest = segments.slice(1);
  const fetchImpl = options.fetchImpl ?? fetch;
  const { baseUrl, token } = options;

  if (head === "payout-requests" && rest.length === 0) {
    const { rows, wrap } = listRows(body);
    if (rows.length === 0) return body;
    return wrap(await enrichDoctorRows(rows, baseUrl, token, fetchImpl));
  }

  if (head === "payout-requests" && rest.length === 1 && isPlainObject(body)) {
    const rawRequest = isPlainObject(body.request) ? body.request : body;
    if (hasBankDetails(nestedMethod(rawRequest)) || hasBankDetails(nestedMethod(body))) {
      return body;
    }
    const [enriched] = await enrichDoctorRows([rawRequest], baseUrl, token, fetchImpl);
    if (isPlainObject(body.request)) {
      return { ...body, request: enriched, payout_method: enriched.payout_method };
    }
    return enriched;
  }

  if (head === "patient-withdrawals" && rest.length === 0) {
    const { rows, wrap } = listRows(body);
    if (rows.length === 0) return body;
    return wrap(await enrichPatientRows(rows, baseUrl, token, fetchImpl));
  }

  if (head === "patient-withdrawals" && rest.length === 1 && isPlainObject(body)) {
    const rawRequest = isPlainObject(body.request) ? body.request : body;
    if (
      hasBankDetails(nestedMethod(rawRequest)) ||
      hasBankDetails(nestedMethod(body))
    ) {
      return body;
    }
    const [enriched] = await enrichPatientRows([rawRequest], baseUrl, token, fetchImpl);
    if (isPlainObject(body.request)) {
      return { ...body, request: enriched, payout_method: enriched.payout_method };
    }
    return enriched;
  }

  return body;
}
