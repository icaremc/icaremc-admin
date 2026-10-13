import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_PAGE_SIZE } from "@/lib/listPagination";
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
  limit: number;
  hasMore: boolean;
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
  limit: DEFAULT_PAGE_SIZE,
  hasMore: false,
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
  async (
    args: { limit?: number } | undefined,
    { rejectWithValue },
  ) => {
    const limit = args?.limit ?? DEFAULT_PAGE_SIZE;
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await fetch(`/api/admin/appointments?${params.toString()}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as {
      appointments: Appointment[];
      pagination?: { hasMore: boolean; limit: number };
    };
    return {
      appointments: body.appointments,
      limit,
      hasMore: body.pagination?.hasMore ?? body.appointments.length >= limit,
    };
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
    const body = (await response.json()) as {
      appointment?: Appointment;
    } & Partial<Appointment>;
    const appointment = body.appointment ?? body;
    return {
      ...(appointment && typeof appointment === "object" ? appointment : {}),
      id,
      status,
    } as Appointment;
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
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = action.payload.appointments;
        state.limit = action.payload.limit;
        state.hasMore = action.payload.hasMore;
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
      .addCase(updateAppointmentStatus.fulfilled, (state, action) => {
        state.savingId = null;
        // ponytail: match by request id — staging PATCH row may omit/mismatch id
        const id = action.meta.arg.id;
        const index = state.appointments.findIndex((a) => a.id === id);
        if (index >= 0) {
          state.appointments[index] = {
            ...state.appointments[index],
            ...action.payload,
            id,
            status: action.meta.arg.status,
          };
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
