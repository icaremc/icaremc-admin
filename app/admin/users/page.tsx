"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  createUser,
  fetchProfiles,
  profilesActions,
} from "@/features/profiles/profilesSlice";
import { LOCALES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { Locale, Profile } from "@/lib/types/database";

function pushStatusLabel(profile: Profile) {
  if (!profile.fcm_token) {
    return { label: "No token", className: "bg-amber-50 text-amber-700" };
  }

  if (profile.notifications_enabled === false) {
    return { label: "Off", className: "bg-gray-100 text-gray-600" };
  }

  return { label: "Ready", className: "bg-emerald-50 text-emerald-700" };
}

function PushStatusBadge({ profile }: { profile: Profile }) {
  const push = pushStatusLabel(profile);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${push.className}`}
    >
      {push.label}
    </span>
  );
}

const emptyForm = {
  email: "",
  password: "",
  full_name: "",
  phone: "",
  locale: "en" as Locale,
};

export default function UsersPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { profiles, loading, error, creating } = useAppSelector(
    (state) => state.profiles,
  );
  const [query, setQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    dispatch(fetchProfiles());
  }, [dispatch]);

  const filtered = profiles.filter((profile) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return [profile.full_name, profile.phone, profile.locale]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    dispatch(profilesActions.clearProfilesError());

    const result = await dispatch(
      createUser({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: "mother",
        locale: form.locale,
      }),
    );

    if (createUser.fulfilled.match(result)) {
      setForm(emptyForm);
      setShowCreateForm(false);
    }
  };

  return (
    <>
      <PageHero
        title="Parents"
        description="Mother profiles from the app — tap a row for pregnancy, vitals, and children"
        icon={Users}
        stat={{ label: "Total parents", value: profiles.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, locale..."
              className="w-full rounded-[var(--radius)] border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
            />
          </div>
          <Button
            type="button"
            onClick={() => setShowCreateForm((open) => !open)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? "Close form" : "Create parent"}
          </Button>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreate} className="mb-6 admin-panel">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              New parent account
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create_email">Email</Label>
                <Input
                  id="create_email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_password">Temporary password</Label>
                <Input
                  id="create_password"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      password: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_name">Full name</Label>
                <Input
                  id="create_name"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      full_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_phone">Phone</Label>
                <Input
                  id="create_phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_locale">Locale</Label>
                <select
                  id="create_locale"
                  value={form.locale}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      locale: e.target.value as Locale,
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {locale.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create parent"}
              </Button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Loading parents...
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">Name</TableHead>
                <TableHead className="font-semibold text-gray-700">Phone</TableHead>
                <TableHead className="font-semibold text-gray-700">Locale</TableHead>
                <TableHead className="font-semibold text-gray-700">Onboarding</TableHead>
                <TableHead className="font-semibold text-gray-700">Push</TableHead>
                <TableHead className="font-semibold text-gray-700">Joined</TableHead>
                <TableHead className="font-semibold text-gray-700 w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    No parents found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((profile) => (
                  <TableRow
                    key={profile.id}
                    className="group cursor-pointer hover:bg-emerald-50/60"
                    onClick={() => router.push(`/admin/users/${profile.id}`)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      {profile.full_name || "Unnamed parent"}
                    </TableCell>
                    <TableCell>{profile.phone || "-"}</TableCell>
                    <TableCell>{profile.locale || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          profile.onboarding_complete
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {profile.onboarding_complete ? "Complete" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PushStatusBadge profile={profile} />
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDateTime(profile.created_at)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-5 w-5 text-emerald-600 opacity-70 transition group-hover:opacity-100" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
