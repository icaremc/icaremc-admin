"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Copy,
  CreditCard,
  RefreshCw,
  Save,
  Search,
  Settings2,
} from "lucide-react";
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
import type { AppSubscriptionMember } from "@/lib/appMembership/members";
import type { AppMembershipSettingsData } from "@/lib/appMembership/subscriptionSettings";
import { ExtendMembershipModal } from "@/components/appMembership/ExtendMembershipModal";
import { formatMoney } from "@/lib/appointments/display";
import { formatDate, formatDateTime } from "@/lib/format";
import { useAdminCanManage } from "@/lib/useAdminPermissions";
import { cn } from "@/lib/utils";

type Tab = "payments" | "pricing";
type StatusFilter = "all" | "active" | "expired" | "cancelled";

function statusBadge(member: AppSubscriptionMember) {
  if (member.has_access) {
    return { label: "Active", className: "bg-emerald-50 text-emerald-700" };
  }
  if (member.status === "cancelled") {
    return { label: "Cancelled", className: "bg-red-50 text-red-700" };
  }
  if (member.status === "expired") {
    return { label: "Expired", className: "bg-amber-50 text-amber-800" };
  }
  return { label: "Inactive", className: "bg-gray-100 text-gray-600" };
}

function daysUntil(endsAt: string): number {
  return Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function FinanceAppMembershipPage() {
  const canManage = useAdminCanManage("manage_finance");
  const [tab, setTab] = useState<Tab>("payments");
  const [settings, setSettings] = useState<AppMembershipSettingsData | null>(null);
  const [members, setMembers] = useState<AppSubscriptionMember[]>([]);
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingPatientId, setActingPatientId] = useState<string | null>(null);
  const [extendTarget, setExtendTarget] = useState<AppSubscriptionMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState("");

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/app-membership-settings");
      const payload = (await res.json()) as {
        error?: string;
        appMembershipSettings?: AppMembershipSettingsData;
        updatedAt?: string | null;
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load settings");
      setSettings(payload.appMembershipSettings ?? null);
      setSettingsUpdatedAt(payload.updatedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
      setSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (expiringOnly) params.set("expiringDays", "14");
      if (showHistory) params.set("history", "1");

      const res = await fetch(`/api/admin/app-membership-members?${params.toString()}`);
      const payload = (await res.json()) as {
        error?: string;
        members?: AppSubscriptionMember[];
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load payments");
      setMembers(payload.members ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [expiringOnly, showHistory, statusFilter]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) =>
      [member.patient_name, member.patient_phone, member.chapa_tx_ref, member.patient_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [members, query]);

  const stats = useMemo(() => {
    const active = members.filter((m) => m.has_access).length;
    const expiring = members.filter(
      (m) => m.has_access && daysUntil(m.ends_at) <= 14 && daysUntil(m.ends_at) >= 0,
    ).length;
    const revenue = members.reduce((sum, m) => sum + Number(m.amount_paid ?? 0), 0);
    const currency = members[0]?.currency ?? settings?.currency ?? "ETB";
    return { active, expiring, revenue, currency, count: filtered.length };
  }, [filtered.length, members, settings?.currency]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/app-membership-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appMembershipSettings: settings }),
      });
      const payload = (await res.json()) as {
        error?: string;
        appMembershipSettings?: AppMembershipSettingsData;
        updatedAt?: string | null;
      };
      if (!res.ok) throw new Error(payload.error ?? "Save failed");
      setSettings(payload.appMembershipSettings ?? settings);
      setSettingsUpdatedAt(payload.updatedAt ?? null);
      setMessage("Pricing saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runMemberAction = async (
    patientId: string,
    action: "revoke",
  ) => {
    if (!canManage) return;
    setActingPatientId(patientId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/app-membership-members/${patientId}/${action}`,
        { method: "POST" },
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Action failed");
      setMessage("Membership revoked.");
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingPatientId(null);
    }
  };

  const confirmExtend = async (input: { amountPaid: number; receipt: File }) => {
    if (!canManage || !extendTarget) return;
    setActingPatientId(extendTarget.patient_id);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("receipt", input.receipt);
      formData.set("amountPaid", String(input.amountPaid));

      const res = await fetch(
        `/api/admin/app-membership-members/${extendTarget.patient_id}/grant`,
        { method: "POST", body: formData },
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Extend failed");

      setExtendTarget(null);
      setMessage("Membership extended.");
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extend failed");
    } finally {
      setActingPatientId(null);
    }
  };

  async function copyRef(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Chapa reference copied.");
    } catch {
      setError("Could not copy reference.");
    }
  }

  return (
    <>
      <PageHero
        title="App membership"
        description="Yearly MC subscription via Chapa. Separate from doctor visit payments."
        icon={BadgeCheck}
        stat={{ label: "Active members", value: stats.active }}
      />

      <div className="admin-page">
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-1">
          <button
            type="button"
            onClick={() => setTab("payments")}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === "payments"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            <CreditCard className="h-4 w-4" />
            Payments
          </button>
          <button
            type="button"
            onClick={() => setTab("pricing")}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === "pricing"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            <Settings2 className="h-4 w-4" />
            Pricing & paywall
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {tab === "payments" ? (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Active access", value: String(stats.active) },
                { label: "Expiring ≤14 days", value: String(stats.expiring) },
                {
                  label: "Shown payments",
                  value: String(stats.count),
                },
                {
                  label: "Amount (view)",
                  value: formatMoney(stats.revenue, stats.currency),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search parent, phone, Chapa ref…"
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["all", "active", "expired", "cancelled"] as StatusFilter[]).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFilter(value)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                        statusFilter === value
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                      )}
                    >
                      {value}
                    </button>
                  ),
                )}
                <Button
                  type="button"
                  variant={expiringOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpiringOnly((current) => !current)}
                >
                  Expiring soon
                </Button>
                <Button
                  type="button"
                  variant={showHistory ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowHistory((current) => !current)}
                >
                  All attempts
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadMembers()}
                  disabled={loadingMembers}
                >
                  <RefreshCw className={cn("h-4 w-4", loadingMembers && "animate-spin")} />
                </Button>
              </div>
            </div>

            <p className="mb-3 text-sm text-gray-500">
              {showHistory
                ? "Every Chapa attempt, including superseded cancelled payments."
                : "Latest payment per parent. Turn on All attempts to see retries."}
            </p>

            <div className="admin-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMembers ? (
                    <TableRow>
                      <TableCell
                        colSpan={canManage ? 6 : 5}
                        className="py-12 text-center text-gray-500"
                      >
                        Loading payments…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canManage ? 6 : 5}
                        className="py-12 text-center text-gray-500"
                      >
                        No payments match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((member) => {
                      const badge = statusBadge(member);
                      const remaining = member.has_access ? daysUntil(member.ends_at) : null;

                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <Link
                              href={`/admin/users/${member.patient_id}`}
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              {member.patient_name ?? "Unknown parent"}
                            </Link>
                            <p className="text-xs text-gray-500">
                              {member.patient_phone ?? member.patient_id}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                                badge.className,
                              )}
                            >
                              {badge.label}
                            </span>
                            {remaining !== null && remaining >= 0 ? (
                              <p className="mt-1 text-xs text-gray-500">
                                {remaining === 0 ? "Ends today" : `${remaining}d left`}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            <p>{formatDate(member.starts_at)}</p>
                            <p className="text-xs text-gray-400">
                              → {formatDate(member.ends_at)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-gray-900">
                              {formatMoney(member.amount_paid, member.currency)}
                            </p>
                            <p className="text-xs capitalize text-gray-500">
                              {member.payment_method}
                            </p>
                          </TableCell>
                          <TableCell>
                            {member.chapa_tx_ref ? (
                              <div className="flex max-w-[200px] items-center gap-1">
                                <span className="truncate font-mono text-xs text-gray-600">
                                  {member.chapa_tx_ref}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void copyRef(member.chapa_tx_ref!)}
                                  className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                  title="Copy reference"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : member.admin_receipt_url ? (
                              <a
                                href={member.admin_receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-emerald-700 hover:underline"
                              >
                                View receipt
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                            <p className="text-xs text-gray-400">
                              {formatDateTime(member.created_at)}
                            </p>
                          </TableCell>
                          {canManage ? (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actingPatientId === member.patient_id}
                                  onClick={() => setExtendTarget(member)}
                                >
                                  Extend
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                                  disabled={
                                    actingPatientId === member.patient_id ||
                                    member.status !== "active"
                                  }
                                  onClick={() =>
                                    void runMemberAction(member.patient_id, "revoke")
                                  }
                                >
                                  Revoke
                                </Button>
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="admin-panel admin-page-settings max-w-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                {settingsUpdatedAt
                  ? `Last saved ${formatDateTime(settingsUpdatedAt)}`
                  : "Not saved yet"}
              </p>
              {canManage ? (
                <Button onClick={() => void handleSaveSettings()} disabled={saving || loadingSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving…" : "Save pricing"}
                </Button>
              ) : null}
            </div>

            {loadingSettings || !settings ? (
              <p className="text-sm text-gray-600">Loading pricing…</p>
            ) : (
              <>
                <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={settings.enabled}
                    onChange={(event) =>
                      setSettings({ ...settings, enabled: event.target.checked })
                    }
                    disabled={!canManage}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">
                      Membership enabled
                    </span>
                    <span className="block text-sm text-gray-500">
                      When off, the MC app skips the yearly paywall.
                    </span>
                  </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="yearly_price">Yearly price</Label>
                    <Input
                      id="yearly_price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={settings.yearlyPrice}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          yearlyPrice: Number(event.target.value),
                        })
                      }
                      disabled={!canManage}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={settings.currency}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          currency: event.target.value.toUpperCase(),
                        })
                      }
                      disabled={!canManage}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="duration_days">Duration (days)</Label>
                    <Input
                      id="duration_days"
                      type="number"
                      min={1}
                      value={settings.durationDays}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          durationDays: Number(event.target.value),
                        })
                      }
                      disabled={!canManage}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={settings.requireForAppAccess}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        requireForAppAccess: event.target.checked,
                      })
                    }
                    disabled={!canManage}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">
                      Require membership for app access
                    </span>
                    <span className="block text-sm text-gray-500">
                      Guests stay ungated. Signed-in parents without access see the paywall.
                    </span>
                  </span>
                </label>

                <p className="text-sm text-gray-500">
                  Price changes apply to new checkouts only. Existing paid periods are unchanged.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <ExtendMembershipModal
        member={extendTarget}
        settings={settings}
        open={extendTarget !== null}
        loading={actingPatientId === extendTarget?.patient_id}
        onClose={() => {
          if (actingPatientId === extendTarget?.patient_id) return;
          setExtendTarget(null);
        }}
        onConfirm={confirmExtend}
      />
    </>
  );
}
