import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import type { PregnancyLog } from "@/lib/types/database";

type PregnancyLogsState = {
  logs: PregnancyLog[];
  loading: boolean;
  error: string | null;
};

const initialState: PregnancyLogsState = {
  logs: [],
  loading: false,
  error: null,
};

export const fetchPregnancyLogs = createAsyncThunk(
  "pregnancyLogs/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("pregnancy_logs")
      .select(
        "*, mothers(user_id), pregnancy_weeks(week_number)",
      )
      .order("log_date", { ascending: false })
      .limit(200);

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as PregnancyLog[];
  },
);

const pregnancyLogsSlice = createSlice({
  name: "pregnancyLogs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPregnancyLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPregnancyLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
      })
      .addCase(fetchPregnancyLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const pregnancyLogsReducer = pregnancyLogsSlice.reducer;
