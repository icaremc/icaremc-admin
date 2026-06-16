import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export function pushEnvError() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase service role is not configured on the server." },
      { status: 500 },
    );
  }
  return null;
}

export async function authenticatePushRequest(request: Request) {
  const envError = pushEnvError();
  if (envError) return { error: envError } as const;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!token) {
    return {
      error: NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 }),
    } as const;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const authClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      error: NextResponse.json({ error: "Invalid or expired session." }, { status: 401 }),
    } as const;
  }

  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { user: userData.user, serviceClient } as const;
}
