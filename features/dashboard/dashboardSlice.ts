import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isBackendApiEnabled } from "@/lib/backend/config";
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

async function countTable(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

async function countMotherProfiles(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "mother");

  if (error) throw error;
  return count ?? 0;
}

/** Returns 0 when table is missing (mobile-only schema). */
async function countTableOptional(table: string): Promise<number> {
  try {
    return await countTable(table);
  } catch {
    return 0;
  }
}

async function countMilestones(): Promise<number> {
  return countTableOptional("child_growth_periods");
}

async function countRecentPregnancyLogs(): Promise<number> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count, error } = await supabase
    .from("pregnancy_logs")
    .select("*", { count: "exact", head: true })
    .gte("updated_at", weekAgo.toISOString());

  if (error) return 0;
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

async function fetchBookingStats(): Promise<{
  total: number;
  pending: number;
}> {
  try {
    const response = await fetch("/api/admin/appointments/stats");
    if (!response.ok) return { total: 0, pending: 0 };
    const body = (await response.json()) as {
      total?: number;
      pending?: number;
    };
    return {
      total: body.total ?? 0,
      pending: body.pending ?? 0,
    };
  } catch {
    return { total: 0, pending: 0 };
  }
}

export const fetchDashboardStats = createAsyncThunk(
  "dashboard/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      if (isBackendApiEnabled()) {
        const response = await fetch("/api/admin/dashboard/analytics");
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          return rejectWithValue(body.error ?? "Failed to load staging dashboard");
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
      }

      const [
        profiles,
        milestones,
        dailyTips,
        pregnancyWeeks,
        pregnancies,
        pregnancyLogs,
        children,
        adminUsers,
        recentLogs,
        bookingStats,
        doctors,
      ] = await Promise.all([
        countMotherProfiles(),
        countMilestones(),
        countTableOptional("daily_tips"),
        countTableOptional("pregnancy_weeks"),
        countTable("pregnancies"),
        countTable("pregnancy_logs"),
        countTable("children"),
        countAdminUsers(),
        countRecentPregnancyLogs(),
        fetchBookingStats(),
        countTableOptional("doctor_profiles"),
      ]);

      return {
        profiles,
        contentItems: milestones + dailyTips,
        pregnancyWeeks,
        pregnancies,
        pregnancyLogs,
        children,
        adminUsers,
        recentLogs,
        appointments: bookingStats.total,
        pendingAppointments: bookingStats.pending,
        doctors,
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
