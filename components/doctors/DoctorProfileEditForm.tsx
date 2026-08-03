"use client";

import { useEffect, useState, type FormEvent } from "react";
import DoctorProfileAvatar from "@/components/doctors/DoctorProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { updateDoctorProfile } from "@/features/doctors/doctorDetailSlice";
import { fetchDoctorCategories } from "@/features/doctorCategories/doctorCategoriesSlice";
import { doctorHasProfilePhoto } from "@/lib/doctors/display";
import type { DoctorProfile } from "@/lib/types/doctors";

type DoctorProfileEditFormProps = {
  doctor: DoctorProfile;
  onCancel: () => void;
  onSaved: () => void;
};

type ProfileFormState = {
  first_name: string;
  last_name: string;
  phone: string;
  specialty: string;
  category_id: string;
  hospital: string;
  license_number: string;
  experience_years: string;
  bio: string;
};

function formFromDoctor(doctor: DoctorProfile): ProfileFormState {
  return {
    first_name: doctor.first_name ?? "",
    last_name: doctor.last_name ?? "",
    phone: doctor.phone ?? "",
    specialty: doctor.specialty ?? "",
    category_id: doctor.category_id ?? "",
    hospital: doctor.hospital ?? "",
    license_number: doctor.license_number ?? "",
    experience_years: String(doctor.experience_years ?? 0),
    bio: doctor.bio ?? "",
  };
}

export default function DoctorProfileEditForm({
  doctor,
  onCancel,
  onSaved,
}: DoctorProfileEditFormProps) {
  const dispatch = useAppDispatch();
  const { saving, error } = useAppSelector((state) => state.doctorDetail);
  const { categories } = useAppSelector((state) => state.doctorCategories);
  const [form, setForm] = useState<ProfileFormState>(() => formFromDoctor(doctor));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    dispatch(fetchDoctorCategories());
  }, [dispatch]);

  useEffect(() => {
    setForm(formFromDoctor(doctor));
    setImageFile(null);
    setRemoveImage(false);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [doctor]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleImageChange(file: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function handleCategoryChange(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);
    setForm((prev) => ({
      ...prev,
      category_id: categoryId,
      specialty: category?.name ?? prev.specialty,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("first_name", form.first_name.trim());
    formData.set("last_name", form.last_name.trim());
    formData.set("phone", form.phone.trim());
    formData.set("specialty", form.specialty.trim());
    formData.set("category_id", form.category_id);
    formData.set("hospital", form.hospital.trim());
    formData.set("license_number", form.license_number.trim());
    formData.set("experience_years", form.experience_years.trim());
    formData.set("bio", form.bio.trim());
    if (removeImage) formData.set("remove_image", "true");
    if (imageFile) formData.set("image", imageFile);

    const result = await dispatch(
      updateDoctorProfile({ id: doctor.id, formData }),
    );
    if (updateDoctorProfile.fulfilled.match(result)) {
      onSaved();
    }
  }

  const previewUrl =
    imagePreview ??
    (!removeImage && doctorHasProfilePhoto(doctor.profile_photo_url)
      ? doctor.profile_photo_url
      : null);

  return (
    <form onSubmit={handleSubmit} className="admin-panel space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="admin-section-title">Edit profile</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="space-y-3">
          <DoctorProfileAvatar
            firstName={form.first_name || doctor.first_name}
            lastName={form.last_name || doctor.last_name}
            photoUrl={previewUrl}
            size="lg"
          />
          <div>
            <Label htmlFor="doctor-photo">Profile photo</Label>
            <Input
              id="doctor-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1"
              onChange={(event) =>
                handleImageChange(event.target.files?.[0] ?? null)
              }
            />
            {(doctorHasProfilePhoto(doctor.profile_photo_url) || imageFile) &&
            !removeImage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  handleImageChange(null);
                  setRemoveImage(true);
                }}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="doctor-first-name">First name</Label>
            <Input
              id="doctor-first-name"
              value={form.first_name}
              onChange={(event) =>
                setForm({ ...form, first_name: event.target.value })
              }
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="doctor-last-name">Last name</Label>
            <Input
              id="doctor-last-name"
              value={form.last_name}
              onChange={(event) =>
                setForm({ ...form, last_name: event.target.value })
              }
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="doctor-phone">Phone</Label>
            <Input
              id="doctor-phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="doctor-category">Category</Label>
            <select
              id="doctor-category"
              value={form.category_id}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="doctor-specialty">Specialty</Label>
            <Input
              id="doctor-specialty"
              value={form.specialty}
              onChange={(event) =>
                setForm({ ...form, specialty: event.target.value })
              }
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="doctor-hospital">Hospital</Label>
            <Input
              id="doctor-hospital"
              value={form.hospital}
              onChange={(event) =>
                setForm({ ...form, hospital: event.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="doctor-license">License number</Label>
            <Input
              id="doctor-license"
              value={form.license_number}
              onChange={(event) =>
                setForm({ ...form, license_number: event.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="doctor-experience">Experience (years)</Label>
            <Input
              id="doctor-experience"
              type="number"
              min={0}
              value={form.experience_years}
              onChange={(event) =>
                setForm({ ...form, experience_years: event.target.value })
              }
              className="mt-1"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="doctor-bio">Bio</Label>
            <Textarea
              id="doctor-bio"
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              className="mt-1"
              rows={4}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
