"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  createHospital,
  deleteHospital,
  fetchHospitals,
  hospitalsActions,
  updateHospital,
} from "@/features/hospitals/hospitalsSlice";
import { formatDateTime } from "@/lib/format";
import type { Hospital } from "@/lib/types/hospitals";

const emptyForm = {
  name: "",
  description: "",
  address: "",
  city: "",
  phone: "",
};

export default function HospitalsPage() {
  const dispatch = useAppDispatch();
  const { hospitals, loading, error, saving, creating } = useAppSelector(
    (state) => state.hospitals,
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchHospitals());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const activeCount = useMemo(
    () => hospitals.filter((hospital) => hospital.is_active).length,
    [hospitals],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.set("name", form.name.trim());
    formData.set("description", form.description.trim());
    formData.set("address", form.address.trim());
    formData.set("city", form.city.trim());
    formData.set("phone", form.phone.trim());
    if (imageFile) formData.set("image", imageFile);
    return formData;
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    dispatch(hospitalsActions.clearHospitalsError());

    const result = await dispatch(createHospital(buildFormData()));
    if (createHospital.fulfilled.match(result)) {
      resetForm();
      setShowForm(false);
    }
  };

  const handleToggleActive = (hospital: Hospital) => {
    dispatch(
      updateHospital({
        id: hospital.id,
        json: { is_active: !hospital.is_active },
      }),
    );
  };

  const handleDelete = (hospital: Hospital) => {
    if (
      !window.confirm(
        `Delete "${hospital.name}"? This only works if no doctors are linked to it.`,
      )
    ) {
      return;
    }
    dispatch(deleteHospital(hospital.id));
  };

  return (
    <>
      <PageHero
        title="Hospitals"
        description="Manage hospitals and clinics doctors can select when completing their profile."
        icon={Building2}
        stat={{ label: "Active hospitals", value: activeCount }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex justify-end">
          <Button
            type="button"
            onClick={() => {
              setShowForm((open) => !open);
              if (showForm) resetForm();
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Close form" : "Add hospital"}
          </Button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {showForm ? (
          <form
            onSubmit={handleCreate}
            className="admin-panel mb-6 grid gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <Label htmlFor="hospital-name">Hospital name</Label>
              <Input
                id="hospital-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="St. Paul's Hospital"
                className="mt-1"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="hospital-description">Description</Label>
              <Textarea
                id="hospital-description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Short overview for doctors and patients"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="hospital-address">Address</Label>
              <Input
                id="hospital-address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hospital-city">City</Label>
              <Input
                id="hospital-city"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hospital-phone">Phone</Label>
              <Input
                id="hospital-phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hospital-image">Hospital image</Label>
              <Input
                id="hospital-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1"
                onChange={(event) =>
                  handleImageChange(event.target.files?.[0] ?? null)
                }
              />
            </div>
            {imagePreview ? (
              <div className="md:col-span-2">
                <img
                  src={imagePreview}
                  alt="Hospital preview"
                  className="h-40 w-full max-w-sm rounded-xl border object-cover"
                />
              </div>
            ) : null}
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Saving…" : "Create hospital"}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                    Loading hospitals…
                  </TableCell>
                </TableRow>
              ) : hospitals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                    No hospitals yet. Add clinics doctors can choose from.
                  </TableCell>
                </TableRow>
              ) : (
                hospitals.map((hospital) => (
                  <TableRow key={hospital.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {hospital.image_url ? (
                          <img
                            src={hospital.image_url}
                            alt={hospital.name}
                            className="h-10 w-10 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                            <Building2 className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{hospital.name}</p>
                          <p className="text-xs text-gray-500">{hospital.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{hospital.city ?? "—"}</TableCell>
                    <TableCell>{hospital.phone ?? "—"}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleToggleActive(hospital)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          hospital.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {hospital.is_active ? "Active" : "Inactive"}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDateTime(hospital.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDelete(hospital)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
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
