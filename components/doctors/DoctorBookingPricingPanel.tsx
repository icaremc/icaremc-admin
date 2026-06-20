"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DoctorProfile, DoctorService } from "@/lib/types/doctors";

type DraftService = {
  id?: string;
  name: string;
  description: string;
  price: string;
  is_active: boolean;
};

function prepaymentLabel(doctor: DoctorProfile) {
  if (doctor.prepayment_mode === "full") return "Full prepayment";
  if (doctor.prepayment_mode === "percent") {
    return `${doctor.prepayment_percent}% prepayment`;
  }
  return "Pay at clinic";
}

export default function DoctorBookingPricingPanel({
  doctor,
  onSaved,
}: {
  doctor: DoctorProfile;
  onSaved: () => void;
}) {
  const initialServices = useMemo<DraftService[]>(
    () =>
      (doctor.doctor_services ?? []).map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description ?? "",
        price: String(service.price),
        is_active: service.is_active,
      })),
    [doctor.doctor_services],
  );

  const [prepaymentMode, setPrepaymentMode] = useState(doctor.prepayment_mode);
  const [prepaymentPercent, setPrepaymentPercent] = useState(
    String(doctor.prepayment_percent ?? 50),
  );
  const [currency, setCurrency] = useState(doctor.currency ?? "ETB");
  const [services, setServices] = useState<DraftService[]>(initialServices);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addService = () => {
    setServices((current) => [
      ...current,
      { name: "", description: "", price: "", is_active: true },
    ]);
  };

  const updateService = (index: number, patch: Partial<DraftService>) => {
    setServices((current) =>
      current.map((service, i) => (i === index ? { ...service, ...patch } : service)),
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        prepayment_mode: prepaymentMode,
        prepayment_percent: Number.parseInt(prepaymentPercent, 10) || 0,
        currency,
        services: services
          .filter((service) => service.name.trim())
          .map((service) => ({
            id: service.id,
            name: service.name.trim(),
            description: service.description.trim() || null,
            price: Number.parseFloat(service.price) || 0,
            is_active: service.is_active,
          })),
      };

      const response = await fetch(`/api/admin/doctors/${doctor.id}/booking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save booking settings");
      }
      setMessage("Booking services and prepayment settings saved.");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-panel space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="admin-section-title">Services & fees</h2>
          <p className="text-sm text-gray-500">
            Current rule: {prepaymentLabel(doctor)}
          </p>
        </div>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save booking pricing"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Prepayment</span>
          <select
            value={prepaymentMode}
            onChange={(event) =>
              setPrepaymentMode(event.target.value as DoctorProfile["prepayment_mode"])
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          >
            <option value="none">Pay at clinic</option>
            <option value="percent">Partial prepayment (%)</option>
            <option value="full">Full prepayment</option>
          </select>
        </label>
        {prepaymentMode === "percent" ? (
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Percent</span>
            <input
              type="number"
              min={1}
              max={100}
              value={prepaymentPercent}
              onChange={(event) => setPrepaymentPercent(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
        ) : null}
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Currency</span>
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Services</h3>
          <Button type="button" variant="outline" size="sm" onClick={addService}>
            Add service
          </Button>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-gray-500">No services configured yet.</p>
        ) : (
          services.map((service, index) => (
            <div
              key={service.id ?? `new-${index}`}
              className="grid gap-3 rounded-xl border border-gray-200 p-4 sm:grid-cols-2"
            >
              <input
                value={service.name}
                onChange={(event) => updateService(index, { name: event.target.value })}
                placeholder="Service name"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                value={service.price}
                onChange={(event) => updateService(index, { price: event.target.value })}
                placeholder="Price"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <textarea
                value={service.description}
                onChange={(event) =>
                  updateService(index, { description: event.target.value })
                }
                placeholder="Service details"
                className="min-h-[72px] rounded-lg border border-gray-200 px-3 py-2 text-sm sm:col-span-2"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={service.is_active}
                  onChange={(event) =>
                    updateService(index, { is_active: event.target.checked })
                  }
                />
                Active
              </label>
            </div>
          ))
        )}
      </div>

      {(doctor.doctor_services ?? []).length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Live services
          </p>
          <ul className="space-y-2 text-sm text-gray-800">
            {(doctor.doctor_services ?? []).map((service: DoctorService) => (
              <li key={service.id} className="flex justify-between gap-3">
                <span>
                  {service.name}
                  {!service.is_active ? " (inactive)" : ""}
                </span>
                <span className="font-medium">
                  {service.price} {service.currency}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
