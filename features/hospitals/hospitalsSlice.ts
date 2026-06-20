import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Hospital } from "@/lib/types/hospitals";

type HospitalsState = {
  hospitals: Hospital[];
  loading: boolean;
  saving: boolean;
  creating: boolean;
  error: string | null;
};

const initialState: HospitalsState = {
  hospitals: [],
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

export const fetchHospitals = createAsyncThunk(
  "hospitals/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/hospitals");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { hospitals: Hospital[] };
    return body.hospitals;
  },
);

export const createHospital = createAsyncThunk(
  "hospitals/create",
  async (formData: FormData, { rejectWithValue }) => {
    const response = await fetch("/api/admin/hospitals", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { hospital: Hospital };
    return body.hospital;
  },
);

export const updateHospital = createAsyncThunk(
  "hospitals/update",
  async (
    payload: { id: string; formData?: FormData; json?: Record<string, unknown> },
    { rejectWithValue },
  ) => {
    const { id, formData, json } = payload;
    const response = await fetch(`/api/admin/hospitals/${id}`, {
      method: "PATCH",
      headers: formData ? undefined : { "Content-Type": "application/json" },
      body: formData ?? JSON.stringify(json ?? {}),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { hospital: Hospital };
    return body.hospital;
  },
);

export const deleteHospital = createAsyncThunk(
  "hospitals/delete",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/hospitals/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    return id;
  },
);

const hospitalsSlice = createSlice({
  name: "hospitals",
  initialState,
  reducers: {
    clearHospitalsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHospitals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHospitals.fulfilled, (state, action) => {
        state.loading = false;
        state.hospitals = action.payload;
      })
      .addCase(fetchHospitals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createHospital.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createHospital.fulfilled, (state, action) => {
        state.creating = false;
        state.hospitals = [...state.hospitals, action.payload].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
      })
      .addCase(createHospital.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      .addCase(updateHospital.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateHospital.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.hospitals.findIndex((h) => h.id === action.payload.id);
        if (index >= 0) state.hospitals[index] = action.payload;
        state.hospitals.sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
      })
      .addCase(updateHospital.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteHospital.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteHospital.fulfilled, (state, action) => {
        state.saving = false;
        state.hospitals = state.hospitals.filter((h) => h.id !== action.payload);
      })
      .addCase(deleteHospital.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const hospitalsActions = hospitalsSlice.actions;
export const hospitalsReducer = hospitalsSlice.reducer;
