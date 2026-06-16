import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
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
  async (payload: { name: string }, { rejectWithValue }) => {
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
  },
);

export const updateDoctorCategory = createAsyncThunk(
  "doctorCategories/update",
  async (
    payload: {
      id: string;
      name?: string;
      sort_order?: number;
      is_active?: boolean;
    },
    { rejectWithValue },
  ) => {
    const { id, ...updates } = payload;
    const response = await fetch(`/api/admin/doctor-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
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
        state.error = action.payload as string;
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
        state.error = action.payload as string;
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
        state.error = action.payload as string;
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
        state.error = action.payload as string;
      });
  },
});

export const doctorCategoriesActions = doctorCategoriesSlice.actions;
export const doctorCategoriesReducer = doctorCategoriesSlice.reducer;
