import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isBackendApiEnabled } from "@/lib/backend/config";
import type {
  Child,
  ChildGrowthMeasurement,
  ChildGrowthPeriod,
  ChildMilestoneCheck,
  ChildUpdatePayload,
  ChildVaccineRecord,
  VaccineDoseSchedule,
} from "@/lib/types/database";

export type ChildDetailPayload = {
  child: Child;
  milestoneChecks: ChildMilestoneCheck[];
  measurements: ChildGrowthMeasurement[];
  vaccineRecords: ChildVaccineRecord[];
  vaccineSchedule: VaccineDoseSchedule[];
  growthPeriods: ChildGrowthPeriod[];
};

type ChildrenState = {
  children: Child[];
  selected: ChildDetailPayload | null;
  loading: boolean;
  detailLoading: boolean;
  saving: boolean;
  error: string | null;
};

const initialState: ChildrenState = {
  children: [],
  selected: null,
  loading: false,
  detailLoading: false,
  saving: false,
  error: null,
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

function asDetailPayload(body: Record<string, unknown>): ChildDetailPayload | null {
  const child = body.child;
  if (!child || typeof child !== "object") return null;
  return {
    child: child as Child,
    milestoneChecks: Array.isArray(body.milestoneChecks)
      ? (body.milestoneChecks as ChildMilestoneCheck[])
      : [],
    measurements: Array.isArray(body.measurements)
      ? (body.measurements as ChildGrowthMeasurement[])
      : [],
    vaccineRecords: Array.isArray(body.vaccineRecords)
      ? (body.vaccineRecords as ChildVaccineRecord[])
      : [],
    vaccineSchedule: Array.isArray(body.vaccineSchedule)
      ? (body.vaccineSchedule as VaccineDoseSchedule[])
      : [],
    growthPeriods: Array.isArray(body.growthPeriods)
      ? (body.growthPeriods as ChildGrowthPeriod[])
      : [],
  };
}

export const fetchChildren = createAsyncThunk(
  "children/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/children");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as {
      children?: Child[];
      items?: Child[];
    };
    return (body.children ?? body.items ?? []) as Child[];
  },
);

export const fetchChildDetail = createAsyncThunk(
  "children/fetchDetail",
  async (childId: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/children/${childId}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as Record<string, unknown>;
    const detail = asDetailPayload(body);
    if (!detail) return rejectWithValue("Child not found");
    return detail;
  },
);

export const updateChild = createAsyncThunk(
  "children/update",
  async (
    { childId, patch }: { childId: string; patch: ChildUpdatePayload },
    { rejectWithValue },
  ) => {
    if (isBackendApiEnabled()) {
      return rejectWithValue(
        "Editing children is not available on the admin API yet.",
      );
    }

    const response = await fetch(`/api/admin/children/${childId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { child?: Child };
    if (!body.child) return rejectWithValue("Child update failed");
    return body.child;
  },
);

const childrenSlice = createSlice({
  name: "children",
  initialState,
  reducers: {
    clearChildDetail(state) {
      state.selected = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChildren.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChildren.fulfilled, (state, action) => {
        state.loading = false;
        state.children = action.payload;
      })
      .addCase(fetchChildren.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchChildDetail.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchChildDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = action.payload;
      })
      .addCase(fetchChildDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateChild.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateChild.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload;
        state.children = state.children.map((c) =>
          c.id === updated.id ? updated : c,
        );
        if (state.selected?.child.id === updated.id) {
          state.selected = { ...state.selected, child: updated };
        }
      })
      .addCase(updateChild.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const childrenActions = childrenSlice.actions;
export const childrenReducer = childrenSlice.reducer;
