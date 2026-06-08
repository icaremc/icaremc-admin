import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
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
  mothers: 0,
  pregnancyLogs: 0,
  childProfiles: 0,
  appointments: 0,
  adminUsers: 0,
  recentLogs: 0,
};

const initialState: DashboardState = {
  stats: emptyStats,
  loading: false,
  error: null,
};

async function countTable(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

async function countRecentLogs(): Promise<number> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const date = weekAgo.toISOString().slice(0, 10);

  const { count, error } = await supabase
    .from("pregnancy_logs")
    .select("*", { count: "exact", head: true })
    .gte("log_date", date);

  if (error) {
    const fallback = await supabase
      .from("daily_health_logs")
      .select("*", { count: "exact", head: true })
      .gte("log_date", date);
    if (fallback.error) throw fallback.error;
    return fallback.count ?? 0;
  }

  return count ?? 0;
}

async function countAdminUsers(): Promise<number> {
  const { count, error } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) throw error;
  return count ?? 0;
}

export const fetchDashboardStats = createAsyncThunk(
  "dashboard/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const [
        profiles,
        contentItems,
        pregnancyWeeks,
        mothers,
        pregnancyLogs,
        childProfiles,
        appointments,
        adminUsers,
        recentLogs,
      ] = await Promise.all([
        countTable("profiles"),
        countTable("content_translations"),
        countTable("pregnancy_weeks"),
        countTable("mothers"),
        countTable("pregnancy_logs"),
        countTable("child_profiles"),
        countTable("appointments"),
        countAdminUsers(),
        countRecentLogs(),
      ]);

      return {
        profiles,
        contentItems,
        pregnancyWeeks,
        mothers,
        pregnancyLogs,
        childProfiles,
        appointments,
        adminUsers,
        recentLogs,
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
