"use client";

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isBackendApiEnabled } from "@/lib/backend/config";
import { slugifyCategoryName } from "@/lib/doctors/display";
import type { DoctorCategory } from "@/lib/types/doctors";

type DoctorCategoriesState = {
  categories: DoctorCategory[];
  loading: boolean;
  saving: boolean;
  creating: boolean;
  error: string | null;
};

const initialState: DoctorCategoriesState = {
  categories: [],
  loading: false,
  saving: false,
  creating: false,
  error: null,
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

function formDataToCategoryPayload(formData: FormData): {
  payload: Record<string, unknown>;
  hasImageFile: boolean;
} {
  const nameEn = String(formData.get("name_en") ?? formData.get("name") ?? "").trim();
  const nameAm = String(formData.get("name_am") ?? "").trim();
  const nameOm = String(formData.get("name_om") ?? "").trim();
  const payload: Record<string, unknown> = {};
  const hasImageFile = formData.get("image") instanceof File;

  if (nameEn) {
    payload.name = nameEn;
    payload.slug = slugifyCategoryName(nameEn);
  }

  const careFocus = formData.get("care_focus");
  if (typeof careFocus === "string" && careFocus.trim()) {
    payload.care_focus = careFocus.trim();
  }

  const sortOrder = formData.get("sort_order");
  if (typeof sortOrder === "string" && sortOrder.trim()) {
    const parsed = Number(sortOrder);
    if (Number.isFinite(parsed)) payload.sort_order = parsed;
  }

  if (formData.get("remove_image") === "true") {
    payload.image_url = null;
  }

  const isActive = formData.get("is_active");
  if (typeof isActive === "string" && isActive !== "") {
    payload.is_active = isActive === "true" || isActive === "1";
  }

  const translations: Array<{ language_code: string; name: string }> = [];
  if (nameEn) translations.push({ language_code: "en", name: nameEn });
  if (nameAm) translations.push({ language_code: "am", name: nameAm });
  if (nameOm) translations.push({ language_code: "om", name: nameOm });
  if (translations.length > 0) payload.translations = translations;

  return { payload, hasImageFile };
}

export const fetchDoctorCategories = createAsyncThunk(
  "doctorCategories/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/doctor-categories");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { categories: DoctorCategory[] };
    return body.categories;
  },
);

export const createDoctorCategory = createAsyncThunk(
  "doctorCategories/create",
  async (formData: FormData, { rejectWithValue }) => {
    if (isBackendApiEnabled()) {
      const { payload, hasImageFile } = formDataToCategoryPayload(formData);
      if (hasImageFile) {
        return rejectWithValue(
          "Speciality image upload is not available on staging yet. Save name/settings first.",
        );
      }
      if (typeof payload.name !== "string" || !payload.name) {
        return rejectWithValue("English name is required");
      }
      const response = await fetch("/api/admin/doctor-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        return rejectWithValue(await readApiError(response));
      }
      const body = (await response.json()) as { category: DoctorCategory };
      return body.category;
    }

    const response = await fetch("/api/admin/doctor-categories", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { category: DoctorCategory };
    return body.category;
  },
);

export const updateDoctorCategory = createAsyncThunk(
  "doctorCategories/update",
  async (
    payload: {
      id: string;
      formData?: FormData;
      json?: {
        name?: string;
        sort_order?: number;
        is_active?: boolean;
      };
    },
    { rejectWithValue },
  ) => {
    const { id, formData, json } = payload;

    if (isBackendApiEnabled()) {
      let body: Record<string, unknown> = { ...(json ?? {}) };
      if (formData) {
        const converted = formDataToCategoryPayload(formData);
        if (converted.hasImageFile) {
          return rejectWithValue(
            "Speciality image upload is not available on staging yet. Use production for images.",
          );
        }
        body = { ...body, ...converted.payload };
      }
      const response = await fetch(`/api/admin/doctor-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        return rejectWithValue(await readApiError(response));
      }
      const result = (await response.json()) as { category: DoctorCategory };
      return result.category;
    }

    const response = await fetch(`/api/admin/doctor-categories/${id}`, {
      method: "PATCH",
      headers: formData ? undefined : { "Content-Type": "application/json" },
      body: formData ?? JSON.stringify(json ?? {}),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { category: DoctorCategory };
    return body.category;
  },
);

export const deleteDoctorCategory = createAsyncThunk(
  "doctorCategories/delete",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/doctor-categories/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    return id;
  },
);

const doctorCategoriesSlice = createSlice({
  name: "doctorCategories",
  initialState,
  reducers: {
    clearDoctorCategoriesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctorCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchDoctorCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load specialities";
      })
      .addCase(createDoctorCategory.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createDoctorCategory.fulfilled, (state, action) => {
        state.creating = false;
        state.categories = [...state.categories, action.payload].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
      })
      .addCase(createDoctorCategory.rejected, (state, action) => {
        state.creating = false;
        state.error = (action.payload as string) ?? "Failed to create speciality";
      })
      .addCase(updateDoctorCategory.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateDoctorCategory.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.categories.findIndex((c) => c.id === action.payload.id);
        if (index >= 0) state.categories[index] = action.payload;
        state.categories.sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
      })
      .addCase(updateDoctorCategory.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? "Failed to update speciality";
      })
      .addCase(deleteDoctorCategory.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteDoctorCategory.fulfilled, (state, action) => {
        state.saving = false;
        state.categories = state.categories.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteDoctorCategory.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? "Failed to delete speciality";
      });
  },
});

export const doctorCategoriesReducer = doctorCategoriesSlice.reducer;
export const doctorCategoriesActions = doctorCategoriesSlice.actions;
