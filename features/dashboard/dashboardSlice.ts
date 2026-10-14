import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { DashboardStats } from "@/lib/types/database";

type DashboardState = {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
};

const emptyStats: DashboardStats = {
  profiles: 0,
  contentItems: 0,
  pregnancyWeeks: 0,
  pregnancies: 0,
  pregnancyLogs: 0,
  children: 0,
  adminUsers: 0,
  recentLogs: 0,
  appointments: 0,
  pendingAppointments: 0,
  doctors: 0,
};

const initialState: DashboardState = {
  stats: emptyStats,
  loading: false,
  error: null,
};

export const fetchDashboardStats = createAsyncThunk(
  "dashboard/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/dashboard/analytics");
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        return rejectWithValue(body.error ?? "Failed to load dashboard");
      }
      const payload = (await response.json()) as {
        analytics?: Record<string, unknown>;
      } & Record<string, unknown>;
      const a = (payload.analytics ?? payload) as Record<string, unknown>;
      const num = (key: string) =>
        typeof a[key] === "number" ? (a[key] as number) : 0;

      return {
        profiles: num("profiles"),
        contentItems: 0,
        pregnancyWeeks: 0,
        pregnancies: num("pregnancies"),
        pregnancyLogs: 0,
        children: num("children"),
        adminUsers: num("admin_users"),
        recentLogs: 0,
        appointments: num("appointments"),
        pendingAppointments: num("pending_appointments"),
        doctors: num("doctors"),
      } satisfies DashboardStats;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load dashboard stats.",
      );
    }
  },
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const dashboardReducer = dashboardSlice.reducer;
