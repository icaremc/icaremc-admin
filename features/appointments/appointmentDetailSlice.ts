import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AppointmentDetailPayload } from "@/lib/types/chat";

type AppointmentDetailState = {
  appointmentId: string | null;
  detail: AppointmentDetailPayload | null;
  loading: boolean;
  error: string | null;
};

const initialState: AppointmentDetailState = {
  appointmentId: null,
  detail: null,
  loading: false,
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

export const fetchAppointmentDetail = createAsyncThunk(
  "appointmentDetail/fetch",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/appointments/${id}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    return (await response.json()) as AppointmentDetailPayload;
  },
);

const appointmentDetailSlice = createSlice({
  name: "appointmentDetail",
  initialState,
  reducers: {
    clearAppointmentDetail(state) {
      state.appointmentId = null;
      state.detail = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointmentDetail.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.appointmentId = action.meta.arg;
      })
      .addCase(fetchAppointmentDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.detail = action.payload;
      })
      .addCase(fetchAppointmentDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const appointmentDetailActions = appointmentDetailSlice.actions;
export const appointmentDetailReducer = appointmentDetailSlice.reducer;
