import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { doctorVerificationEventLabel } from "@/lib/activity/buildLog";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission, requireAdminViewPermission } from "@/lib/adminAuth";
import {
  removeDoctorProfilePhoto,
  uploadDoctorProfilePhoto,
} from "@/lib/doctors/storage";
import {
  doctorApprovalPushMessage,
  sendDoctorPush,
} from "@/lib/push/sendDoctorPush";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorProfile } from "@/lib/types/doctors";

type RouteContext = { params: Promise<{ id: string }> };

const DOCTOR_SELECT =
  "*, doctor_availability_slots(*), doctor_services(*), doctor_categories(id, name, slug)";

function readTextField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (value == null) return undefined;
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminViewPermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("doctor_profiles")
      .select(DOCTOR_SELECT)
      .eq("id", id)
      .order("day_of_week", {
        foreignTable: "doctor_availability_slots",
        ascending: true,
      })
      .order("start_time", {
        foreignTable: "doctor_availability_slots",
        ascending: true,
      })
      .order("sort_order", {
        foreignTable: "doctor_services",
        ascending: true,
      })
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ doctor: data as DoctorProfile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

async function patchVerification(
  request: Request,
  auth: Exclude<Awaited<ReturnType<typeof requireAdminManagePermission>>, { error: string }>,
  id: string,
  isVerified: boolean,
) {
  const client = createServiceSupabaseClient();

  const { data: existing, error: existingError } = await client
    .from("doctor_profiles")
    .select("is_verified, first_name")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const { data, error } = await client
    .from("doctor_profiles")
    .update({ is_verified: isVerified })
    .eq("id", id)
    .select(DOCTOR_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const doctor = data as DoctorProfile;
  const wasApproved = isVerified && !existing.is_verified;
  let push:
    | { sent: true; messageId: string }
    | { sent: false; skipped: string }
    | { sent: false; error: string }
    | undefined;

  if (wasApproved) {
    const pushResult = await sendDoctorPush({
      serviceClient: client,
      userId: id,
      input: doctorApprovalPushMessage(doctor.first_name),
    });

    if (pushResult.ok && "messageId" in pushResult && pushResult.messageId) {
      push = { sent: true, messageId: pushResult.messageId };
    } else if (pushResult.ok && "skipped" in pushResult) {
      push = { sent: false, skipped: pushResult.skipped ?? "Push skipped" };
    } else if (!pushResult.ok) {
      push = { sent: false, error: pushResult.error };
    }
  }

  await logAdminActivityFromAuth(
    auth,
    {
      eventType: ADMIN_ACTIVITY_EVENTS.DOCTOR_UPDATED,
      eventLabel: doctorVerificationEventLabel({
        isVerified,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
      }),
      resourceType: "doctor_profile",
      resourceId: id,
      metadata: {
        is_verified: isVerified,
        doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
        specialty: doctor.specialty ?? null,
      },
    },
    request,
  );

  return NextResponse.json({ doctor, push });
}

async function patchProfile(
  request: Request,
  auth: Exclude<Awaited<ReturnType<typeof requireAdminManagePermission>>, { error: string }>,
  id: string,
  formData: FormData,
) {
  const client = createServiceSupabaseClient();
  const updates: Record<string, unknown> = {};

  const firstName = readTextField(formData, "first_name");
  const lastName = readTextField(formData, "last_name");
  const phone = readTextField(formData, "phone");
  const specialty = readTextField(formData, "specialty");
  const hospital = readTextField(formData, "hospital");
  const licenseNumber = readTextField(formData, "license_number");
  const bio = readTextField(formData, "bio");
  const categoryId = readTextField(formData, "category_id");
  const experienceYearsRaw = readTextField(formData, "experience_years");
  const removeImage = formData.get("remove_image") === "true";
  const image = formData.get("image");

  if (firstName !== undefined) {
    if (!firstName) {
      return NextResponse.json({ error: "First name cannot be empty" }, { status: 400 });
    }
    updates.first_name = firstName;
  }
  if (lastName !== undefined) {
    if (!lastName) {
      return NextResponse.json({ error: "Last name cannot be empty" }, { status: 400 });
    }
    updates.last_name = lastName;
  }
  if (phone !== undefined) updates.phone = phone || null;
  if (specialty !== undefined) {
    if (!specialty) {
      return NextResponse.json({ error: "Specialty cannot be empty" }, { status: 400 });
    }
    updates.specialty = specialty;
  }
  if (hospital !== undefined) updates.hospital = hospital;
  if (licenseNumber !== undefined) updates.license_number = licenseNumber || null;
  if (bio !== undefined) updates.bio = bio || null;
  if (categoryId !== undefined) updates.category_id = categoryId || null;

  if (experienceYearsRaw !== undefined) {
    const experienceYears = Number.parseInt(experienceYearsRaw, 10);
    if (Number.isNaN(experienceYears) || experienceYears < 0) {
      return NextResponse.json(
        { error: "Experience years must be a non-negative number" },
        { status: 400 },
      );
    }
    updates.experience_years = experienceYears;
  }

  const { data: existing, error: existingError } = await client
    .from("doctor_profiles")
    .select("profile_photo_url, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  if (removeImage) {
    await removeDoctorProfilePhoto(client, existing.profile_photo_url);
    updates.profile_photo_url = null;
  }

  if (image instanceof File && image.size > 0) {
    const imageUrl = await uploadDoctorProfilePhoto(client, id, image);
    updates.profile_photo_url = imageUrl;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from("doctor_profiles")
    .update(updates)
    .eq("id", id)
    .select(DOCTOR_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const doctor = data as DoctorProfile;

  await logAdminActivityFromAuth(
    auth,
    {
      eventType: ADMIN_ACTIVITY_EVENTS.DOCTOR_UPDATED,
      eventLabel: `Updated profile for Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
      resourceType: "doctor_profile",
      resourceId: id,
      metadata: {
        doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
        specialty: doctor.specialty ?? null,
        fields: Object.keys(updates).filter((key) => key !== "updated_at"),
      },
    },
    request,
  );

  return NextResponse.json({ doctor });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminManagePermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      return await patchProfile(request, auth, id, formData);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const isVerified =
      body &&
      typeof body === "object" &&
      "is_verified" in body &&
      typeof (body as { is_verified: unknown }).is_verified === "boolean"
        ? (body as { is_verified: boolean }).is_verified
        : null;

    if (isVerified === null) {
      return NextResponse.json(
        { error: "is_verified boolean is required" },
        { status: 400 },
      );
    }

    return await patchVerification(request, auth, id, isVerified);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
