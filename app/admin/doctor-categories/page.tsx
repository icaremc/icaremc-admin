"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Tags, Trash2, X } from "lucide-react";
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
  createDoctorCategory,
  deleteDoctorCategory,
  doctorCategoriesActions,
  fetchDoctorCategories,
  updateDoctorCategory,
} from "@/features/doctorCategories/doctorCategoriesSlice";
import { specialityHasImage } from "@/lib/doctors/display";
import { formatDateTime } from "@/lib/format";
import type { DoctorCategory } from "@/lib/types/doctors";

const emptyForm = { name: "" };

type EditFormState = {
  name: string;
  sort_order: string;
  remove_image: boolean;
};

function SpecialityThumbnail({
  category,
  onUpload,
  disabled,
}: {
  category: DoctorCategory;
  onUpload: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [broken, setBroken] = useState(false);
  const showImage = specialityHasImage(category.image_url) && !broken;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="group relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-emerald-50 disabled:opacity-50"
        title="Change image"
      >
        {showImage ? (
          <img
            src={category.image_url!.trim()}
            alt={category.name}
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-emerald-700">
            <Tags className="h-4 w-4" />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          Image
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export default function DoctorCategoriesPage() {
  const dispatch = useAppDispatch();
  const { categories, loading, error, saving, creating } = useAppSelector(
    (state) => state.doctorCategories,
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<DoctorCategory | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    sort_order: "",
    remove_image: false,
  });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchDoctorCategories());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (editImagePreview?.startsWith("blob:")) URL.revokeObjectURL(editImagePreview);
    };
  }, [imagePreview, editImagePreview]);

  const activeCount = useMemo(
    () => categories.filter((category) => category.is_active).length,
    [categories],
  );

  const resetCreateForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const resetEditForm = () => {
    setEditingCategory(null);
    setEditForm({ name: "", sort_order: "", remove_image: false });
    setEditImageFile(null);
    if (editImagePreview?.startsWith("blob:")) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(null);
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleEditImageChange = (file: File | null) => {
    setEditImageFile(file);
    setEditForm((current) => ({ ...current, remove_image: false }));
    if (editImagePreview?.startsWith("blob:")) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const buildCreateFormData = () => {
    const formData = new FormData();
    formData.set("name", form.name.trim());
    if (imageFile) formData.set("image", imageFile);
    return formData;
  };

  const buildEditFormData = () => {
    if (!editingCategory) return null;
    const formData = new FormData();
    formData.set("name", editForm.name.trim());
    formData.set("sort_order", editForm.sort_order.trim());
    if (editForm.remove_image) formData.set("remove_image", "true");
    if (editImageFile) formData.set("image", editImageFile);
    return formData;
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    dispatch(doctorCategoriesActions.clearDoctorCategoriesError());

    const result = await dispatch(createDoctorCategory(buildCreateFormData()));
    if (createDoctorCategory.fulfilled.match(result)) {
      resetCreateForm();
      setShowForm(false);
    }
  };

  const startEdit = (category: DoctorCategory) => {
    setShowForm(false);
    resetCreateForm();
    setEditingCategory(category);
    setEditForm({
      name: category.name,
      sort_order: String(category.sort_order),
      remove_image: false,
    });
    setEditImageFile(null);
    setEditImagePreview(category.image_url?.trim() || null);
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingCategory) return;

    dispatch(doctorCategoriesActions.clearDoctorCategoriesError());
    const formData = buildEditFormData();
    if (!formData) return;

    const result = await dispatch(
      updateDoctorCategory({ id: editingCategory.id, formData }),
    );
    if (updateDoctorCategory.fulfilled.match(result)) {
      resetEditForm();
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    dispatch(updateDoctorCategory({ id, json: { is_active: !isActive } }));
  };

  const handleImageUpload = (id: string, file: File) => {
    const formData = new FormData();
    formData.set("image", file);
    dispatch(updateDoctorCategory({ id, formData }));
  };

  const handleDelete = (id: string, name: string) => {
    if (
      !window.confirm(
        `Delete speciality "${name}"? This only works if no doctors are assigned to it.`,
      )
    ) {
      return;
    }
    if (editingCategory?.id === id) resetEditForm();
    dispatch(deleteDoctorCategory(id));
  };

  const editPreviewSrc =
    editForm.remove_image
      ? null
      : editImagePreview;

  return (
    <>
      <PageHero
        title="Speciality"
        description="Specialities doctors pick when completing their profile."
        icon={Tags}
        stat={{ label: "Active specialities", value: activeCount }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex justify-end">
          <Button
            type="button"
            onClick={() => {
              const next = !showForm;
              setShowForm(next);
              if (next) resetEditForm();
              if (!next) resetCreateForm();
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Close form" : "Add speciality"}
          </Button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {editingCategory ? (
          <form
            onSubmit={handleUpdate}
            className="admin-panel mb-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-gray-900">
                Edit speciality
              </h2>
              <button
                type="button"
                onClick={resetEditForm}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-speciality-name">Speciality name</Label>
                <Input
                  id="edit-speciality-name"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-speciality-sort">Sort order</Label>
                <Input
                  id="edit-speciality-sort"
                  type="number"
                  min={1}
                  value={editForm.sort_order}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      sort_order: event.target.value,
                    }))
                  }
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-speciality-image">Replace image</Label>
                <Input
                  id="edit-speciality-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-1"
                  onChange={(event) =>
                    handleEditImageChange(event.target.files?.[0] ?? null)
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                {editPreviewSrc ? (
                  <img
                    src={editPreviewSrc}
                    alt="Speciality preview"
                    className="h-24 w-24 rounded-xl border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-400">
                    <Tags className="h-6 w-6" />
                  </div>
                )}
                {specialityHasImage(editingCategory.image_url) ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editForm.remove_image}
                      onChange={(event) => {
                        const remove = event.target.checked;
                        setEditForm((current) => ({
                          ...current,
                          remove_image: remove,
                        }));
                        if (remove) {
                          setEditImageFile(null);
                          if (editImagePreview?.startsWith("blob:")) {
                            URL.revokeObjectURL(editImagePreview);
                          }
                          setEditImagePreview(null);
                        } else {
                          setEditImagePreview(editingCategory.image_url?.trim() || null);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Remove current image
                  </label>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetEditForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null}

        {showForm ? (
          <form
            onSubmit={handleCreate}
            className="admin-panel mb-6 grid gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <Label htmlFor="speciality-name">Speciality name</Label>
              <Input
                id="speciality-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Obstetrics & Gynecology"
                className="mt-1"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Sort order is assigned automatically (1, 2, 3…).
              </p>
            </div>
            <div>
              <Label htmlFor="speciality-image">Image (optional)</Label>
              <Input
                id="speciality-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1"
                onChange={(event) =>
                  handleImageChange(event.target.files?.[0] ?? null)
                }
              />
            </div>
            {imagePreview ? (
              <div>
                <img
                  src={imagePreview}
                  alt="Speciality preview"
                  className="h-24 w-24 rounded-xl border object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-400">
                <Tags className="h-6 w-6" />
              </div>
            )}
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Saving…" : "Create speciality"}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Speciality</TableHead>
                <TableHead>Filter slug</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                    Loading specialities…
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                    No specialities yet. Add options doctors can choose from.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className={
                      editingCategory?.id === category.id ? "bg-emerald-50/50" : undefined
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <SpecialityThumbnail
                          category={category}
                          disabled={saving}
                          onUpload={(file) => handleImageUpload(category.id, file)}
                        />
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      {category.slug}
                    </TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          handleToggleActive(category.id, category.is_active)
                        }
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          category.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {category.is_active ? "Active" : "Inactive"}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDateTime(category.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => startEdit(category)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleDelete(category.id, category.name)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
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
