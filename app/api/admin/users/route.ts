import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  accountTypeForRole,
  isUserRole,
  type CreateUserInput,
} from "@/lib/roles";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Locale, Profile } from "@/lib/types/database";

function parseCreateBody(body: unknown): CreateUserInput | string {
  if (!body || typeof body !== "object") return "Invalid request body";

  const data = body as Record<string, unknown>;
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const role = typeof data.role === "string" ? data.role : "";

  if (!email) return "Email is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!isUserRole(role)) return "Role must be admin, mother, or partner";

  const locale =
    typeof data.locale === "string" &&
    ["en", "am", "om"].includes(data.locale)
      ? (data.locale as Locale)
      : "en";

  return {
    email,
    password,
    role,
    locale,
    full_name:
      typeof data.full_name === "string" ? data.full_name.trim() : undefined,
    phone: typeof data.phone === "string" ? data.phone.trim() : undefined,
  };
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let serviceClient;
  try {
    serviceClient = createServiceSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server is missing SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500 },
    );
  }

  const parsed = parseCreateBody(await request.json());
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const accountType = accountTypeForRole(parsed.role);

  const { data: created, error: createError } =
    await serviceClient.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      app_metadata: {
        role: parsed.role === "admin" ? "admin" : parsed.role,
      },
      user_metadata: {
        full_name: parsed.full_name ?? "",
        phone: parsed.phone ?? "",
        account_type: accountType,
        role: parsed.role,
        locale: parsed.locale,
      },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Could not create user" },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .update({
      full_name: parsed.full_name || null,
      phone: parsed.phone || null,
      account_type: accountType,
      role: parsed.role,
      is_admin: parsed.role === "admin",
      locale: parsed.locale,
    })
    .eq("id", created.user.id)
    .select("*")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ profile: profile as Profile }, { status: 201 });
}
