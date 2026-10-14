import type { AppSubscriptionMember } from "@/lib/appMembership/members";

type ParentProfile = {
  name: string | null;
  phone: string | null;
};

function readProfile(body: unknown): ParentProfile | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  const profile =
    row.profile && typeof row.profile === "object" && !Array.isArray(row.profile)
      ? (row.profile as Record<string, unknown>)
      : row.user && typeof row.user === "object" && !Array.isArray(row.user)
        ? (row.user as Record<string, unknown>)
        : row;
  const name = profile.full_name ?? profile.fullName ?? profile.name;
  const phone = profile.phone;
  return {
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
  };
}

/** Membership list often omits parent name; fill from user detail. */
export async function enrichMembershipParents(
  members: AppSubscriptionMember[],
  fetchImpl: typeof fetch = fetch,
): Promise<AppSubscriptionMember[]> {
  const missingIds = [
    ...new Set(
      members
        .filter((member) => !member.patient_name?.trim() && member.patient_id)
        .map((member) => member.patient_id),
    ),
  ];
  if (missingIds.length === 0) return members;

  const profiles = new Map<string, ParentProfile>();
  await Promise.all(
    missingIds.map(async (id) => {
      try {
        const response = await fetchImpl(`/api/admin/users/${id}`);
        if (!response.ok) return;
        const profile = readProfile(await response.json());
        if (profile) profiles.set(id, profile);
      } catch {
        // ponytail: leave Unknown parent if detail fetch fails
      }
    }),
  );

  if (profiles.size === 0) return members;

  return members.map((member) => {
    const hit = profiles.get(member.patient_id);
    if (!hit) return member;
    return {
      ...member,
      patient_name: member.patient_name?.trim()
        ? member.patient_name
        : hit.name,
      patient_phone: member.patient_phone?.trim()
        ? member.patient_phone
        : hit.phone,
    };
  });
}
