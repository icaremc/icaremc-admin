import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
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
    const response = await fetch("/api/admin/pregnancy-logs");
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return rejectWithValue(body.error ?? "Failed to load pregnancy logs");
    }
    const body = (await response.json()) as { logs?: PregnancyLog[] };
    return (body.logs ?? []) as PregnancyLog[];
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
