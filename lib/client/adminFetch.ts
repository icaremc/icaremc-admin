"use client";

import { isBackendApiEnabled } from "@/lib/backend/config";
import { supabase } from "@/lib/supabaseClient";

/** Same-origin admin API fetch; attaches Supabase Bearer when present (prod). Staging uses httpOnly cookies. */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!isBackendApiEnabled()) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
