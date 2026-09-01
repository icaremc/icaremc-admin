"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Coins, Gift, RefreshCw, Search, Settings2 } from "lucide-react";
import PageHero from "@/components/PageHero";
import ReferralSettingsPanel from "@/components/referrals/ReferralSettingsPanel";
import { AdminSelect, type AdminSelectOption } from "@/components/ui/admin-select";
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
import { formatMoney } from "@/lib/appointments/display";
import { doctorDisplayName } from "@/lib/doctors/display";
import { formatDateTime } from "@/lib/format";
import type { ReferralCommissionRow, ReferralListRow } from "@/lib/referrals/types";
import type { DoctorProfile } from "@/lib/types/doctors";
import { cn } from "@/lib/utils";

type Tab = "referrals" | "commissions" | "settings";
type SubscribedFilter = "all" | "yes" | "no";

const SUBSCRIBED_OPTIONS: AdminSelectOption<SubscribedFilter>[] = [
  { value: "all", label: "All patients" },
  { value: "yes", label: "Subscribed only" },
  { value: "no", label: "Registered only" },
];

function isReferralsTab(value: string | null): value is Tab {
  return value === "referrals" || value === "commissions" || value === "settings";
}

export default function ReferralsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(isReferralsTab(tabParam) ? tabParam : "referrals");
  const [referrals, setReferrals] = useState<ReferralListRow[]>([]);
  const [commissions, setCommissions] = useState<ReferralCommissionRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [subscribed, setSubscribed] = useState<SubscribedFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isReferralsTab(tabParam)) setTab(tabParam);
  }, [tabParam]);

  function switchTab(next: Tab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "referrals") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `/admin/referrals?${qs}` : "/admin/referrals");
  }

  const doctorOptions = useMemo<AdminSelectOption<string>[]>(
    () => [
      { value: "", label: "All doctors" },
      ...doctors.map((doctor) => ({
        value: doctor.id,
        label: doctorDisplayName(doctor.first_name, doctor.last_name),
      })),
    ],
    [doctors],
  );

  const loadDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/doctors");
      const payload = (await res.json()) as { doctors?: DoctorProfile[] };
      if (res.ok) setDoctors(payload.doctors ?? []);
    } catch {
      setDoctors([]);
    }
  }, []);

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (doctorId) params.set("doctorId", doctorId);
      if (subscribed !== "all") params.set("subscribed", subscribed);
      if (from) params.set("from", `${from}T00:00:00.000Z`);
      if (to) params.set("to", `${to}T23:59:59.999Z`);

      const res = await fetch(`/api/admin/referrals?${params.toString()}`);
      const payload = (await res.json()) as {
        error?: string;
        referrals?: ReferralListRow[];
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load referrals");
      setReferrals(payload.referrals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referrals");
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, from, subscribed, to]);

  const loadCommissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (doctorId) params.set("doctorId", doctorId);
      if (from) params.set("from", `${from}T00:00:00.000Z`);
      if (to) params.set("to", `${to}T23:59:59.999Z`);

      const res = await fetch(`/api/admin/referral-commissions?${params.toString()}`);
      const payload = (await res.json()) as {
        error?: string;
        commissions?: ReferralCommissionRow[];
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load commissions");
      setCommissions(payload.commissions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load commissions");
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, from, to]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    if (tab === "referrals") void loadReferrals();
    if (tab === "commissions") void loadCommissions();
  }, [loadCommissions, loadReferrals, tab]);

  const filteredReferrals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return referrals;
    return referrals.filter((row) => {
      const haystack = [row.patientName, row.patientPhone, row.doctorName, row.referralCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, referrals]);

  const filteredCommissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commissions;
    return commissions.filter((row) => {
      const haystack = [row.patientName, row.doctorName, row.paymentId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [commissions, query]);

  const subscribedCount = referrals.filter((row) => row.isSubscribed).length;
  const commissionTotal = filteredCommissions.reduce(
    (sum, row) => sum + row.commissionAmount,
    0,
  );

  function refreshActiveTab() {
    if (tab === "commissions") void loadCommissions();
    else if (tab === "referrals") void loadReferrals();
  }

  return (
    <>
      <PageHero
        title="Referrals"
        description="Patient–doctor links and subscription commission payouts."
        icon={Gift}
        stat={{
          label: tab === "commissions" ? "Commission total" : "Subscribed",
          value:
            tab === "commissions"
              ? formatMoney(commissionTotal, filteredCommissions[0]?.currency ?? "ETB", 2)
              : subscribedCount,
        }}
      />

      <div className="admin-page space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => switchTab("referrals")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === "referrals"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              <Gift className="h-4 w-4" />
              Links
            </button>
            <button
              type="button"
              onClick={() => switchTab("commissions")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === "commissions"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              <Coins className="h-4 w-4" />
              Commissions
            </button>
            <button
              type="button"
              onClick={() => switchTab("settings")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === "settings"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>

        {tab === "settings" ? (
          <ReferralSettingsPanel />
        ) : (
          <>
            <div
              className={cn(
                "admin-panel grid gap-4",
                tab === "referrals" ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3",
              )}
            >
              <div>
                <Label htmlFor="referral_doctor">Doctor</Label>
                <AdminSelect
                  id="referral_doctor"
                  value={doctorId}
                  options={doctorOptions}
                  onChange={setDoctorId}
                  className="mt-1.5"
                />
              </div>
              {tab === "referrals" ? (
                <div>
                  <Label htmlFor="referral_subscribed">Subscription</Label>
                  <AdminSelect
                    id="referral_subscribed"
                    value={subscribed}
                    options={SUBSCRIBED_OPTIONS}
                    onChange={setSubscribed}
                    className="mt-1.5"
                  />
                </div>
              ) : null}
              <div>
                <Label htmlFor="referral_from">From</Label>
                <Input
                  id="referral_from"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="referral_to">To</Label>
                <Input
                  id="referral_to"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-55 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    tab === "commissions"
                      ? "Search patient, doctor, payment…"
                      : "Search patient, doctor, or code…"
                  }
                  className="pl-9"
                />
              </div>
              <Button type="button" variant="outline" onClick={refreshActiveTab} disabled={loading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {tab === "commissions" ? (
              <div className="admin-table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                          Loading commissions…
                        </TableCell>
                      </TableRow>
                    ) : filteredCommissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                          No referral commissions yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCommissions.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Link
                              href={`/admin/users/${row.patientId}`}
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              {row.patientName ?? "Patient"}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/admin/doctors/${row.doctorId}`}
                              className="text-sm text-emerald-700 hover:underline"
                            >
                              {row.doctorName ?? "Doctor"}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-gray-700">
                            {formatMoney(row.subscriptionAmount, row.currency)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {row.commissionPercent}%
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-700">
                            {formatMoney(row.commissionAmount, row.currency, 2)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDateTime(row.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Linked</TableHead>
                      <TableHead>Subscription</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-gray-500">
                          Loading referrals…
                        </TableCell>
                      </TableRow>
                    ) : filteredReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-gray-500">
                          No referrals match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReferrals.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Link
                              href={`/admin/users/${row.patientId}`}
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              {row.patientName ?? "Patient"}
                            </Link>
                            {row.patientPhone ? (
                              <p className="text-xs text-gray-500">{row.patientPhone}</p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/admin/doctors/${row.doctorId}`}
                              className="text-sm text-emerald-700 hover:underline"
                            >
                              {row.doctorName ?? "Doctor"}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.referralCode}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDateTime(row.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                                row.isSubscribed
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-600",
                              )}
                            >
                              {row.isSubscribed ? "Subscribed" : "Registered"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
