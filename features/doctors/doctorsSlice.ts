import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { DoctorProfile } from "@/lib/types/doctors";

type DoctorsState = {
  doctors: DoctorProfile[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};

const initialState: DoctorsState = {
  doctors: [],
  loading: false,
  saving: false,
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

export const fetchDoctors = createAsyncThunk(
  "doctors/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/doctors");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { doctors: DoctorProfile[] };
    return body.doctors;
  },
);

export const updateDoctorVerification = createAsyncThunk(
  "doctors/updateVerification",
  async (
    payload: { id: string; is_verified: boolean },
    { rejectWithValue },
  ) => {
    const response = await fetch(`/api/admin/doctors/${payload.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: payload.is_verified }),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { doctor: DoctorProfile };
    return body.doctor;
  },
);

const doctorsSlice = createSlice({
  name: "doctors",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.doctors = action.payload;
      })
      .addCase(fetchDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateDoctorVerification.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateDoctorVerification.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.doctors.findIndex((d) => d.id === action.payload.id);
        if (index >= 0) state.doctors[index] = action.payload;
      })
      .addCase(updateDoctorVerification.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const doctorsReducer = doctorsSlice.reducer;
