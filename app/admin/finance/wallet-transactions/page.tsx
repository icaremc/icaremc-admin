"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import PageHero from "@/components/PageHero";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchWalletTransactions } from "@/features/finance/walletTransactionsSlice";
import { formatMoney } from "@/lib/appointments/display";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function WalletTransactionsPage() {
  const dispatch = useAppDispatch();
  const { transactions, loading, error } = useAppSelector(
    (state) => state.walletTransactions,
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(fetchWalletTransactions());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => {
      const doctor = tx.doctor_profiles;
      const doctorName = doctor
        ? `${doctor.first_name} ${doctor.last_name}`.toLowerCase()
        : "";
      return (
        doctorName.includes(q) ||
        tx.type.toLowerCase().includes(q) ||
        (tx.note ?? "").toLowerCase().includes(q)
      );
    });
  }, [transactions, query]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount);
        if (tx.is_credit) acc.credit += amount;
        else acc.debit += amount;
        return acc;
      },
      { credit: 0, debit: 0 },
    );
  }, [filtered]);

  return (
    <>
      <PageHero
        title="Wallet transactions"
        description="Doctor wallet credits, payout holds, and releases"
        icon={Wallet}
        stat={{ label: "Entries", value: filtered.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search doctor, type, note…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:max-w-xs"
          />
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-700">
              Credits: {formatMoney(totals.credit, "ETB")}
            </span>
            <span className="text-red-700">Debits: {formatMoney(totals.debit, "ETB")}</span>
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                    Loading transactions…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                    No wallet transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => {
                  const doctor = tx.doctor_profiles;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {doctor ? (
                          <Link
                            href={`/admin/doctors/${tx.doctor_id}`}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            Dr. {doctor.first_name} {doctor.last_name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{tx.type.replace(/_/g, " ")}</TableCell>
                      <TableCell
                        className={cn(
                          "font-semibold",
                          tx.is_credit ? "text-emerald-700" : "text-red-700",
                        )}
                      >
                        {tx.is_credit ? "+" : "−"}
                        {formatMoney(Number(tx.amount), "ETB")}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm text-gray-600">
                        {tx.note ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
