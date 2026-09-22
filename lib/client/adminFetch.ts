"use client";

import { supabase } from "@/lib/supabaseClient";

/** Same-origin admin API fetch with the browser Supabase access token. */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
