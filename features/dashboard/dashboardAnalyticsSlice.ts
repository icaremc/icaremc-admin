import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { DashboardAnalytics, DashboardRange } from "@/lib/dashboard/analytics";
import { parseDashboardRange } from "@/lib/dashboard/analytics";

type DashboardAnalyticsState = {
  range: DashboardRange;
  analytics: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
};

const initialState: DashboardAnalyticsState = {
  range: "30d",
  analytics: null,
  loading: false,
  error: null,
};

export const fetchDashboardAnalytics = createAsyncThunk(
  "dashboard/fetchAnalytics",
  async (range: DashboardRange | undefined, { rejectWithValue }) => {
    try {
      const selectedRange = range ?? "30d";
      const response = await fetch(
        `/api/admin/dashboard/analytics?range=${encodeURIComponent(selectedRange)}`,
      );
      const body = (await response.json()) as {
        analytics?: DashboardAnalytics;
        error?: string;
      };

      if (!response.ok) {
        return rejectWithValue(body.error ?? "Failed to load finance analytics.");
      }

      if (!body.analytics) {
        return rejectWithValue("Finance analytics response was empty.");
      }

      return {
        range: parseDashboardRange(selectedRange),
        analytics: body.analytics,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load finance analytics.",
      );
    }
  },
);

const dashboardAnalyticsSlice = createSlice({
  name: "dashboardAnalytics",
  initialState,
  reducers: {
    setDashboardRange(state, action: { payload: DashboardRange }) {
      state.range = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.range = action.payload.range;
        state.analytics = action.payload.analytics;
      })
      .addCase(fetchDashboardAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setDashboardRange } = dashboardAnalyticsSlice.actions;
export const dashboardAnalyticsReducer = dashboardAnalyticsSlice.reducer;
