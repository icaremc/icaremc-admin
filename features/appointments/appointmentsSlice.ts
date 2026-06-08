import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import type { Appointment } from "@/lib/types/database";

type AppointmentsState = {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
};

const initialState: AppointmentsState = {
  appointments: [],
  loading: false,
  error: null,
};

export const fetchAppointments = createAsyncThunk(
  "appointments/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_at", { ascending: false, nullsFirst: false })
      .limit(200);

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as Appointment[];
  },
);

const appointmentsSlice = createSlice({
  name: "appointments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = action.payload;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const appointmentsReducer = appointmentsSlice.reducer;
