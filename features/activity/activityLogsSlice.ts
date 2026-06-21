import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { CombinedActivityLog } from "@/lib/types/activity";

type ActivityLogsState = {
  logs: CombinedActivityLog[];
  loading: boolean;
  error: string | null;
  source: "all" | "admin" | "platform";
  eventType: string;
  actorType: string;
};

const initialState: ActivityLogsState = {
  logs: [],
  loading: false,
  error: null,
  source: "all",
  eventType: "",
  actorType: "",
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

export const fetchActivityLogs = createAsyncThunk(
  "activityLogs/fetch",
  async (
    filters: {
      source?: "all" | "admin" | "platform";
      event_type?: string;
      actor_type?: string;
    },
    { rejectWithValue },
  ) => {
    const params = new URLSearchParams();
    if (filters.source) params.set("source", filters.source);
    if (filters.event_type) params.set("event_type", filters.event_type);
    if (filters.actor_type) params.set("actor_type", filters.actor_type);
    params.set("limit", "100");

    const response = await fetch(`/api/admin/activity-logs?${params.toString()}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }

    const body = (await response.json()) as { logs: CombinedActivityLog[] };
    return { logs: body.logs, filters };
  },
);

const activityLogsSlice = createSlice({
  name: "activityLogs",
  initialState,
  reducers: {
    clearActivityLogsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivityLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs;
        state.source = action.payload.filters.source ?? "all";
        state.eventType = action.payload.filters.event_type ?? "";
        state.actorType = action.payload.filters.actor_type ?? "";
      })
      .addCase(fetchActivityLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load activity";
      });
  },
});

export const activityLogsReducer = activityLogsSlice.reducer;
export const activityLogsActions = activityLogsSlice.actions;
