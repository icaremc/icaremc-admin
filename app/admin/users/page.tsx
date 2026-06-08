"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
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
  updateProfileRole,
} from "@/features/profiles/profilesSlice";
import { LOCALES } from "@/lib/constants";
import { APP_USER_ROLES, type AppUserRole } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/lib/types/database";

const emptyForm = {
  email: "",
  password: "",
  full_name: "",
  phone: "",
  role: "mother" as AppUserRole,
  locale: "en" as Locale,
};

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const { profiles, loading, error, saving, creating } = useAppSelector(
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
    return [
      profile.full_name,
      profile.phone,
      profile.account_type,
      profile.role,
      profile.locale,
    ]
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
        role: form.role,
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
        title="App users"
        description="Mobile app accounts for mothers and partners"
        icon={Users}
        stat={{ label: "Total users", value: profiles.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, role..."
              className="w-full rounded-[var(--radius)] border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
            />
          </div>
          <Button
            type="button"
            onClick={() => setShowCreateForm((open) => !open)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? "Close form" : "Create user"}
          </Button>
        </div>

        {showCreateForm ? (
          <form
            onSubmit={handleCreate}
            className="mb-6 admin-panel"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              New user
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
                <Label htmlFor="create_role">Role</Label>
                <select
                  id="create_role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      role: e.target.value as AppUserRole,
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {APP_USER_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
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
                {creating ? "Creating…" : "Create user"}
              </Button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Loading users...
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
                <TableHead className="font-semibold text-gray-700">Account</TableHead>
                <TableHead className="font-semibold text-gray-700">Role</TableHead>
                <TableHead className="font-semibold text-gray-700">Locale</TableHead>
                <TableHead className="font-semibold text-gray-700">Onboarding</TableHead>
                <TableHead className="font-semibold text-gray-700">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium text-gray-900">
                      {profile.full_name || "—"}
                    </TableCell>
                    <TableCell>{profile.phone || "—"}</TableCell>
                    <TableCell>{profile.account_type || "—"}</TableCell>
                    <TableCell>
                      <select
                        value={profile.role ?? "mother"}
                        disabled={saving}
                        onChange={(event) =>
                          dispatch(
                            updateProfileRole({
                              id: profile.id,
                              role: event.target.value as AppUserRole,
                            }),
                          )
                        }
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      >
                        {APP_USER_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>{profile.locale || "—"}</TableCell>
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
                    <TableCell className="text-gray-600">
                      {formatDateTime(profile.created_at)}
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
