import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import type { SymptomLog } from "@/lib/types/database";

type SymptomLogsState = {
  logs: SymptomLog[];
  loading: boolean;
  error: string | null;
};

const initialState: SymptomLogsState = {
  logs: [],
  loading: false,
  error: null,
};

export const fetchSymptomLogs = createAsyncThunk(
  "symptomLogs/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("symptom_logs")
      .select("*, pregnancies(user_id)")
      .neq("symptom_type", "_checklist")
      .order("log_date", { ascending: false })
      .limit(200);

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as SymptomLog[];
  },
);

const symptomLogsSlice = createSlice({
  name: "symptomLogs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSymptomLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSymptomLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
      })
      .addCase(fetchSymptomLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const symptomLogsReducer = symptomLogsSlice.reducer;
