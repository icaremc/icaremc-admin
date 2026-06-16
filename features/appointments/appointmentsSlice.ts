import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Appointment, AppointmentStatus } from "@/lib/types/doctors";

export type BookingStats = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
};

type AppointmentsState = {
  appointments: Appointment[];
  stats: BookingStats;
  loading: boolean;
  savingId: string | null;
  error: string | null;
};

const emptyStats: BookingStats = {
  total: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
};

const initialState: AppointmentsState = {
  appointments: [],
  stats: emptyStats,
  loading: false,
  savingId: null,
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

export const fetchAppointments = createAsyncThunk(
  "appointments/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/appointments");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { appointments: Appointment[] };
    return body.appointments;
  },
);

export const fetchBookingStats = createAsyncThunk(
  "appointments/fetchStats",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/appointments/stats");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    return (await response.json()) as BookingStats;
  },
);

export const updateAppointmentStatus = createAsyncThunk(
  "appointments/updateStatus",
  async (
    { id, status }: { id: string; status: AppointmentStatus },
    { rejectWithValue },
  ) => {
    const response = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { appointment: Appointment };
    return body.appointment;
  },
);

const appointmentsSlice = createSlice({
  name: "appointments",
  initialState,
  reducers: {
    clearAppointmentsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action: PayloadAction<Appointment[]>) => {
        state.loading = false;
        state.appointments = action.payload;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBookingStats.fulfilled, (state, action: PayloadAction<BookingStats>) => {
        state.stats = action.payload;
      })
      .addCase(updateAppointmentStatus.pending, (state, action) => {
        state.savingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updateAppointmentStatus.fulfilled, (state, action: PayloadAction<Appointment>) => {
        state.savingId = null;
        const index = state.appointments.findIndex((a) => a.id === action.payload.id);
        if (index >= 0) {
          state.appointments[index] = action.payload;
        }
      })
      .addCase(updateAppointmentStatus.rejected, (state, action) => {
        state.savingId = null;
        state.error = action.payload as string;
      });
  },
});

export const { clearAppointmentsError } = appointmentsSlice.actions;
export const appointmentsReducer = appointmentsSlice.reducer;
