import { NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/adminAuth";
import { isAdminRole, type CreateAdminInput } from "@/lib/adminRoles";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { AdminUser } from "@/lib/types/database";

function parseCreateBody(body: unknown): CreateAdminInput | string {
  if (!body || typeof body !== "object") return "Invalid request body";

  const data = body as Record<string, unknown>;
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const adminRole =
    typeof data.admin_role === "string" ? data.admin_role : "";

  if (!email) return "Email is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!isAdminRole(adminRole)) {
    return "Admin role must be super_admin, content_admin, support, or viewer";
  }

  return {
    email,
    password,
    admin_role: adminRole,
    full_name:
      typeof data.full_name === "string" ? data.full_name.trim() : undefined,
  };
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminSession();
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

  const { data: created, error: createError } =
    await serviceClient.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.full_name ?? "",
        account_type: "Admin",
        role: "mother",
      },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Could not create admin account" },
      { status: 400 },
    );
  }

  const adminPayload = {
    id: created.user.id,
    email: parsed.email,
    full_name: parsed.full_name || null,
    admin_role: parsed.admin_role,
    is_active: true,
  };

  const { data: adminUser, error: adminError } = await serviceClient
    .from("admin_users")
    .upsert(adminPayload, { onConflict: "id" })
    .select("*")
    .single();

  if (adminError) {
    await serviceClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: adminError.message }, { status: 400 });
  }

  await serviceClient.from("profiles").upsert(
    {
      id: created.user.id,
      full_name: parsed.full_name || null,
      account_type: "Admin",
      role: "mother",
      is_admin: false,
      locale: "en",
    },
    { onConflict: "id" },
  );

  return NextResponse.json({ admin: adminUser as AdminUser }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Admin id is required" }, { status: 400 });
  }

  if (id === auth.user.id && body.is_active === false) {
    return NextResponse.json(
      { error: "You cannot deactivate your own admin account" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.full_name === "string") {
    updates.full_name = body.full_name.trim() || null;
  }
  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
  }
  if (typeof body.admin_role === "string") {
    if (!isAdminRole(body.admin_role)) {
      return NextResponse.json({ error: "Invalid admin role" }, { status: 400 });
    }
    updates.admin_role = body.admin_role;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();
  const { data, error } = await serviceClient
    .from("admin_users")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ admin: data as AdminUser });
}
