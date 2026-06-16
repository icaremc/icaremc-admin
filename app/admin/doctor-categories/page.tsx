"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Tags, Trash2 } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";

const emptyForm = { name: "" };

export default function DoctorCategoriesPage() {
  const dispatch = useAppDispatch();
  const { categories, loading, error, saving, creating } = useAppSelector(
    (state) => state.doctorCategories,
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    dispatch(fetchDoctorCategories());
  }, [dispatch]);

  const activeCount = useMemo(
    () => categories.filter((category) => category.is_active).length,
    [categories],
  );

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    dispatch(doctorCategoriesActions.clearDoctorCategoriesError());

    const result = await dispatch(
      createDoctorCategory({
        name: form.name.trim(),
      }),
    );

    if (createDoctorCategory.fulfilled.match(result)) {
      setForm(emptyForm);
      setShowForm(false);
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    dispatch(updateDoctorCategory({ id, is_active: !isActive }));
  };

  const handleDelete = (id: string, name: string) => {
    if (
      !window.confirm(
        `Delete category "${name}"? This only works if no doctors are assigned to it.`,
      )
    ) {
      return;
    }
    dispatch(deleteDoctorCategory(id));
  };

  return (
    <>
      <PageHero
        title="Doctor categories"
        description="Specialties doctors pick when completing their profile. Used for filtering in the MC app."
        icon={Tags}
        stat={{ label: "Active categories", value: activeCount }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex justify-end">
          <Button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Close form" : "Add category"}
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
            className="admin-panel mb-6 flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
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
            <Button type="submit" disabled={creating}>
              {creating ? "Saving…" : "Create"}
            </Button>
          </form>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
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
                    Loading categories…
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                    No categories yet. Add specialties doctors can choose from.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium text-gray-900">
                      {category.name}
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
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDelete(category.id, category.name)}
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
