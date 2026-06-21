"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DoctorServiceThumbnail from "@/components/doctors/DoctorServiceThumbnail";
import { formatMoney } from "@/lib/appointments/display";
import type { DoctorProfile } from "@/lib/types/doctors";

type DraftService = {
  id?: string;
  tempId?: string;
  name: string;
  description: string;
  price: string;
  image_url: string | null;
  is_active: boolean;
};

function parsePrice(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function serviceKey(service: DraftService, index: number): string {
  return service.id ?? service.tempId ?? `idx-${index}`;
}

function isComplete(service: DraftService): boolean {
  return Boolean(service.name.trim()) && parsePrice(service.price) > 0;
}

export default function DoctorBookingPricingPanel({
  doctor,
  onSaved,
}: {
  doctor: DoctorProfile;
  onSaved: () => void;
}) {
  const currency = doctor.currency ?? "ETB";

  const initialServices = useMemo<DraftService[]>(
    () =>
      (doctor.doctor_services ?? []).map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description ?? "",
        price: String(service.price),
        image_url: service.image_url ?? null,
        is_active: service.is_active,
      })),
    [doctor.doctor_services],
  );

  const [services, setServices] = useState<DraftService[]>(initialServices);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<DraftService | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    setServices(initialServices);
    setEditingKey(null);
    setEditSnapshot(null);
  }, [initialServices]);

  const visibleCount = services.filter(
    (service) => isComplete(service) && service.is_active,
  ).length;

  const updateService = (index: number, patch: Partial<DraftService>) => {
    setServices((current) =>
      current.map((service, i) => (i === index ? { ...service, ...patch } : service)),
    );
  };

  const startEdit = (index: number) => {
    setEditSnapshot({ ...services[index] });
    setEditingKey(serviceKey(services[index], index));
  };

  const cancelEdit = (index: number) => {
    const service = services[index];
    const isNew = !service.id;

    if (isNew) {
      setServices((current) => current.filter((_, i) => i !== index));
    } else if (editSnapshot) {
      updateService(index, editSnapshot);
    }

    setEditingKey(null);
    setEditSnapshot(null);
  };

  const finishEdit = (index: number) => {
    const service = services[index];
    if (!isComplete(service)) return;
    setEditingKey(null);
    setEditSnapshot(null);
  };

  const addService = () => {
    const tempId = `temp-${Date.now()}`;
    setServices((current) => [
      ...current,
      { tempId, name: "", description: "", price: "", image_url: null, is_active: true },
    ]);
    setEditingKey(tempId);
    setEditSnapshot(null);
  };

  const removeService = (index: number) => {
    if (!window.confirm("Remove this service?")) return;
    setServices((current) => current.filter((_, i) => i !== index));
    setEditingKey(null);
    setEditSnapshot(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        currency,
        services: services
          .filter((service) => service.name.trim())
          .map((service) => ({
            id: service.id,
            name: service.name.trim(),
            description: service.description.trim() || null,
            price: parsePrice(service.price),
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
        throw new Error(data.error ?? "Could not save services");
      }
      setMessage({ type: "ok", text: "Services saved." });
      setEditingKey(null);
      setEditSnapshot(null);
      onSaved();
    } catch (error) {
      setMessage({
        type: "err",
        text: error instanceof Error ? error.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="admin-section-title flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-600" />
            Services
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {visibleCount === 0
              ? "Parents cannot book until at least one service is visible."
              : `${visibleCount} service${visibleCount === 1 ? "" : "s"} available for booking.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addService}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius)] border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-900">No services yet</p>
          <p className="mt-1 text-sm text-gray-500">Each card is one consultation type with a fee.</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addService}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add service
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {services.map((service, index) => {
            const key = serviceKey(service, index);
            const editing = editingKey === key;
            const price = parsePrice(service.price);
            const complete = isComplete(service);

            return (
              <article
                key={key}
                className={`rounded-[var(--radius)] border p-4 ${
                  service.is_active && complete && !editing
                    ? "border-emerald-100 bg-white shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
              >
                {editing ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Edit service
                      </p>
                      <button
                        type="button"
                        onClick={() => cancelEdit(index)}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Cancel edit"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <DoctorServiceThumbnail
                        imageUrl={service.image_url}
                        name={service.name}
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                      <Input
                        value={service.name}
                        onChange={(event) =>
                          updateService(index, { name: event.target.value })
                        }
                        placeholder="e.g. General consultation"
                        className="font-medium"
                        autoFocus
                      />

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={service.price}
                          onChange={(event) =>
                            updateService(index, { price: event.target.value })
                          }
                          placeholder="0"
                          className="w-28"
                        />
                        <span className="text-sm font-medium text-gray-500">{currency}</span>
                      </div>

                      <textarea
                        value={service.description}
                        onChange={(event) =>
                          updateService(index, { description: event.target.value })
                        }
                        placeholder="Optional note for parents"
                        rows={2}
                        className="w-full resize-none rounded-[var(--radius)] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      />

                      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={service.is_active}
                          onChange={(event) =>
                            updateService(index, { is_active: event.target.checked })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                        />
                        Shown to parents when booking
                      </label>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      {!complete ? (
                        <span className="text-xs text-amber-600">Name and price required</span>
                      ) : (
                        <span />
                      )}
                      <Button
                        type="button"
                        size="sm"
                        disabled={!complete}
                        onClick={() => finishEdit(index)}
                      >
                        Done
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <DoctorServiceThumbnail
                        imageUrl={service.image_url}
                        name={service.name}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {service.name.trim() || "Untitled service"}
                            </h3>
                            {complete ? (
                              <p className="mt-1 text-lg font-bold text-emerald-700">
                                {formatMoney(price, currency)}
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-amber-600">
                                Incomplete — tap edit to finish
                              </p>
                            )}
                            {service.description.trim() ? (
                              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                {service.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(index)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700"
                              aria-label="Edit service"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeService(index)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove service"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          service.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {service.is_active ? (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Shown to parents
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Hidden
                          </>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      {message ? (
        <p
          className={`mt-4 text-sm ${
            message.type === "ok" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
