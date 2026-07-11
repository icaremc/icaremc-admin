"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Shield } from "lucide-react";
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
  adminsActions,
  createAdmin,
  fetchAdmins,
  updateAdmin,
} from "@/features/admins/adminsSlice";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  adminRoleLabel,
} from "@/lib/adminRoles";
import { formatDateTime } from "@/lib/format";
import type { AdminRole } from "@/lib/types/database";
import type { UpdateAdminInput } from "@/lib/adminRoles";

const emptyForm = {
  email: "",
  password: "",
  full_name: "",
  admin_role: "content_admin" as AdminRole,
};

type EditingField = {
  adminId: string;
  field: "full_name" | "email" | "role";
};

function EditableHint({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <span className="pointer-events-none absolute bottom-[calc(100%+4px)] left-0 z-20 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-normal text-gray-500 shadow-sm">
      Double click to edit
    </span>
  );
}

function EditableAdminTextCell({
  value,
  displayValue,
  placeholder,
  type = "text",
  disabled,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
}: {
  value: string;
  displayValue: string;
  placeholder: string;
  type?: "text" | "email";
  disabled?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (nextValue: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isEditing) setDraft(value);
  }, [isEditing, value]);

  const label = displayValue || placeholder;
  const sizingText = (isEditing ? draft : label) || placeholder;

  return (
    <div
      className="group relative inline-block max-w-full align-middle"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <EditableHint show={!disabled && !isEditing && isHovered} />

      <span className="inline-grid max-w-full align-middle [&>*]:col-start-1 [&>*]:row-start-1">
        <span
          aria-hidden
          className="invisible whitespace-pre px-0 text-sm font-medium"
        >
          {sizingText}
        </span>

        {isEditing ? (
          <input
            autoFocus
            type={type}
            value={draft}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              onSave(draft);
              onCancelEdit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraft(value);
                onCancelEdit();
              }
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            className="min-w-0 border-0 border-b border-emerald-500 bg-transparent p-0 text-sm font-medium text-gray-900 shadow-none outline-none focus:border-emerald-600 focus:ring-0"
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onDoubleClick={onStartEdit}
            className={`min-w-0 truncate rounded-sm px-0 py-0 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              displayValue ? "cursor-pointer text-gray-900" : "cursor-pointer text-gray-400"
            } hover:text-emerald-700`}
          >
            {label}
          </button>
        )}
      </span>
    </div>
  );
}

function EditableAdminRoleCell({
  value,
  disabled,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
}: {
  value: AdminRole;
  disabled?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (nextRole: AdminRole) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const label = adminRoleLabel(value);

  return (
    <div
      className="group relative inline-block max-w-full align-middle"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <EditableHint show={!disabled && !isEditing && isHovered} />

      {isEditing ? (
        <select
          autoFocus
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onSave(event.target.value as AdminRole);
            onCancelEdit();
          }}
          onBlur={onCancelEdit}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancelEdit();
          }}
          className="h-auto rounded-sm border-0 border-b border-emerald-500 bg-transparent py-0 pl-0 pr-6 text-sm font-medium text-gray-900 outline-none focus:border-emerald-600 focus:ring-0"
        >
          {ADMIN_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onDoubleClick={onStartEdit}
          className="cursor-pointer rounded-sm px-0 py-0 text-left text-sm font-medium text-gray-900 transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {label}
        </button>
      )}
    </div>
  );
}

export default function AdminsPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { admins, loading, error, saving, creating } = useAppSelector(
    (state) => state.admins,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingField, setEditingField] = useState<EditingField | null>(null);

  const canManageAdmins = currentUser?.adminRole === "super_admin";

  useEffect(() => {
    dispatch(fetchAdmins());
  }, [dispatch]);

  const activeCount = useMemo(
    () => admins.filter((admin) => admin.is_active).length,
    [admins],
  );

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    dispatch(adminsActions.clearAdminsError());

    const result = await dispatch(
      createAdmin({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim() || undefined,
        admin_role: form.admin_role,
      }),
    );

    if (createAdmin.fulfilled.match(result)) {
      setForm(emptyForm);
      setShowCreateForm(false);
    }
  };

  function saveAdminField(adminId: string, updates: Omit<UpdateAdminInput, "id">) {
    dispatch(updateAdmin({ id: adminId, ...updates }));
  }

  return (
    <>
      <PageHero
        title="Admins"
        description="Portal accounts with role-based access"
        icon={Shield}
        stat={{ label: "Active admins", value: activeCount }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        {!canManageAdmins ? (
          <div className="mb-6 rounded-[var(--radius)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Only super admins can create or edit admin accounts. You are signed
            in as {adminRoleLabel(currentUser?.adminRole)}.
          </div>
        ) : null}

        {canManageAdmins ? (
          <div className="mb-6 flex justify-end">
            <Button
              type="button"
              onClick={() => setShowCreateForm((open) => !open)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {showCreateForm ? "Close form" : "Create admin"}
            </Button>
          </div>
        ) : null}

        {showCreateForm && canManageAdmins ? (
          <form onSubmit={handleCreate} className="admin-panel mb-6 space-y-4">
            <h2 className="font-heading text-lg font-semibold text-gray-900">
              New admin account
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin_email">Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_password">Temporary password</Label>
                <Input
                  id="admin_password"
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
                <Label htmlFor="admin_name">Full name</Label>
                <Input
                  id="admin_name"
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
                <Label htmlFor="admin_role">Admin role</Label>
                <select
                  id="admin_role"
                  value={form.admin_role}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      admin_role: e.target.value as AdminRole,
                    }))
                  }
                  className="flex h-10 w-full rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {
                    ADMIN_ROLES.find((role) => role.value === form.admin_role)
                      ?.description
                  }
                </p>
              </div>
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create admin"}
            </Button>
          </form>
        ) : null}

        {loading ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Loading admins...
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-[var(--radius)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50">
                <TableHead className="font-semibold text-gray-700">Name</TableHead>
                <TableHead className="font-semibold text-gray-700">Email</TableHead>
                <TableHead className="font-semibold text-gray-700">Role</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No admin accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => {
                  const isSelf = admin.id === currentUser?.id;
                  const isEditingName =
                    editingField?.adminId === admin.id &&
                    editingField.field === "full_name";
                  const isEditingEmail =
                    editingField?.adminId === admin.id &&
                    editingField.field === "email";
                  const isEditingRole =
                    editingField?.adminId === admin.id &&
                    editingField.field === "role";

                  return (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium text-gray-900">
                      {canManageAdmins ? (
                        <EditableAdminTextCell
                          value={admin.full_name ?? ""}
                          displayValue={admin.full_name ?? ""}
                          placeholder="Add full name"
                          disabled={saving}
                          isEditing={isEditingName}
                          onStartEdit={() =>
                            setEditingField({ adminId: admin.id, field: "full_name" })
                          }
                          onCancelEdit={() => setEditingField(null)}
                          onSave={(fullName) => {
                            const trimmed = fullName.trim();
                            if (trimmed === (admin.full_name ?? "").trim()) return;
                            saveAdminField(admin.id, {
                              full_name: trimmed || null,
                            });
                          }}
                        />
                      ) : (
                        admin.full_name || "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      {canManageAdmins ? (
                        <EditableAdminTextCell
                          type="email"
                          value={admin.email}
                          displayValue={admin.email}
                          placeholder="Add email"
                          disabled={saving}
                          isEditing={isEditingEmail}
                          onStartEdit={() =>
                            setEditingField({ adminId: admin.id, field: "email" })
                          }
                          onCancelEdit={() => setEditingField(null)}
                          onSave={(email) => {
                            const normalized = email.trim().toLowerCase();
                            if (
                              !normalized ||
                              normalized === admin.email.trim().toLowerCase()
                            ) {
                              return;
                            }
                            saveAdminField(admin.id, { email: normalized });
                          }}
                        />
                      ) : (
                        admin.email
                      )}
                    </TableCell>
                    <TableCell>
                      {canManageAdmins && !isSelf ? (
                        <EditableAdminRoleCell
                          value={admin.admin_role}
                          disabled={saving}
                          isEditing={isEditingRole}
                          onStartEdit={() =>
                            setEditingField({ adminId: admin.id, field: "role" })
                          }
                          onCancelEdit={() => setEditingField(null)}
                          onSave={(adminRole) => {
                            if (adminRole === admin.admin_role) return;
                            saveAdminField(admin.id, { admin_role: adminRole });
                          }}
                        />
                      ) : (
                        adminRoleLabel(admin.admin_role)
                      )}
                    </TableCell>
                    <TableCell>
                      {canManageAdmins && !isSelf ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            dispatch(
                              updateAdmin({
                                id: admin.id,
                                is_active: !admin.is_active,
                              }),
                            )
                          }
                          className={`inline-flex cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 ${
                            admin.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {admin.is_active ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            admin.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDateTime(admin.created_at)}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <section className="mt-10">
          <h2 className="font-heading text-lg font-semibold text-gray-900">
            Role permissions
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Each portal role grants access to specific sections. Navigation and
            API routes enforce these permissions.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {ADMIN_ROLES.map((role) => (
              <div
                key={role.value}
                className="rounded-[var(--radius)] border border-gray-200 bg-white p-4"
              >
                <h3 className="font-medium text-gray-900">{role.label}</h3>
                <p className="mt-1 text-sm text-gray-600">{role.description}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {role.permissions.map((permission) => (
                    <li
                      key={permission}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      {ADMIN_PERMISSIONS.find((p) => p.value === permission)
                        ?.label ?? permission}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
