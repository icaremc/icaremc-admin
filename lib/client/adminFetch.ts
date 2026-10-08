"use client";

/** Same-origin admin API fetch. Auth is the backend httpOnly cookie. */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
