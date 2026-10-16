import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isBackendApiEnabled } from "@/lib/backend/config";
import { DEFAULT_PAGE_SIZE } from "@/lib/listPagination";
import type {
  Child,
  ChildGrowthMeasurement,
  ChildGrowthPeriod,
  ChildMilestoneCheck,
  ChildUpdatePayload,
  ChildVaccineRecord,
  Locale,
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
  limit: number;
  hasMore: boolean;
};

const initialState: ChildrenState = {
  children: [],
  selected: null,
  loading: false,
  detailLoading: false,
  saving: false,
  error: null,
  limit: DEFAULT_PAGE_SIZE,
  hasMore: false,
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
  async (
    args: { limit?: number } | undefined,
    { rejectWithValue },
  ) => {
    const limit = args?.limit ?? DEFAULT_PAGE_SIZE;
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await fetch(`/api/admin/children?${params.toString()}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as {
      children?: Child[];
      items?: Child[];
      pagination?: { hasMore: boolean; limit: number };
    };
    const children = (body.children ?? body.items ?? []) as Child[];
    return {
      children,
      limit,
      hasMore: body.pagination?.hasMore ?? children.length >= limit,
    };
  },
);

/** GET /api/v1/admin/children/{id}/measurements */
function getChildMeasurements(childId: string) {
  return fetch(`/api/admin/children/${childId}/measurements`);
}

/** GET /api/v1/admin/children/{id}/milestones */
function getChildMilestones(childId: string) {
  return fetch(`/api/admin/children/${childId}/milestones`);
}

/** GET /api/v1/admin/children/{id}/vaccines */
function getChildVaccines(childId: string) {
  return fetch(`/api/admin/children/${childId}/vaccines`);
}

/** GET /api/v1/admin/users/{user_id} — parent profile for child.user_id */
function getParentByUserId(userId: string) {
  return fetch(`/api/admin/users/${userId}`);
}

function profileFromUserBody(
  body: Record<string, unknown>,
): NonNullable<Child["profiles"]> {
  const raw =
    body.profile && typeof body.profile === "object" && !Array.isArray(body.profile)
      ? (body.profile as Record<string, unknown>)
      : body.user && typeof body.user === "object" && !Array.isArray(body.user)
        ? (body.user as Record<string, unknown>)
        : body;
  const fullName =
    (typeof raw.full_name === "string" ? raw.full_name : null) ??
    (typeof raw.fullName === "string" ? raw.fullName : null) ??
    (typeof raw.name === "string" ? raw.name : null);
  return {
    id: typeof raw.id === "string" ? raw.id : undefined,
    full_name: fullName,
    phone: typeof raw.phone === "string" ? raw.phone : null,
    account_type:
      (typeof raw.account_type === "string" ? raw.account_type : null) ??
      (typeof raw.accountType === "string" ? raw.accountType : null),
    locale:
      raw.locale === "en" || raw.locale === "am" || raw.locale === "om"
        ? (raw.locale as Locale)
        : null,
    onboarding_complete: Boolean(
      raw.onboarding_complete ?? raw.onboardingComplete ?? false,
    ),
    notifications_enabled: Boolean(
      raw.notifications_enabled ?? raw.notificationsEnabled ?? true,
    ),
    created_at:
      (typeof raw.created_at === "string" ? raw.created_at : undefined) ??
      (typeof raw.createdAt === "string" ? raw.createdAt : undefined),
  };
}

async function readJsonBody(
  response: Response,
): Promise<Record<string, unknown>> {
  if (!response.ok) return {};
  const body = (await response.json()) as unknown;
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

export const fetchChildDetail = createAsyncThunk(
  "children/fetchDetail",
  async (childId: string, { rejectWithValue }) => {
    const [detailRes, measurementsRes, milestonesRes, vaccinesRes, periodsRes] =
      await Promise.all([
        fetch(`/api/admin/children/${childId}`),
        getChildMeasurements(childId),
        getChildMilestones(childId),
        getChildVaccines(childId),
        fetch("/api/admin/child-growth"),
      ]);

    if (!detailRes.ok) {
      return rejectWithValue(await readApiError(detailRes));
    }

    const detailBody = (await detailRes.json()) as Record<string, unknown>;
    const detail = asDetailPayload(detailBody);
    if (!detail) return rejectWithValue("Child not found");

    const parentRes =
      detail.child.user_id && !detail.child.profiles?.full_name
        ? await getParentByUserId(detail.child.user_id)
        : null;

    const [measurementsBody, milestonesBody, vaccinesBody, periodsBody, parentBody] =
      await Promise.all([
        readJsonBody(measurementsRes),
        readJsonBody(milestonesRes),
        readJsonBody(vaccinesRes),
        readJsonBody(periodsRes),
        parentRes ? readJsonBody(parentRes) : Promise.resolve({}),
      ]);

    const parentProfiles =
      Object.keys(parentBody).length > 0
        ? profileFromUserBody(parentBody)
        : null;

    return {
      ...detail,
      child: {
        ...detail.child,
        profiles: parentProfiles ?? detail.child.profiles ?? null,
      },
      measurements: Array.isArray(measurementsBody.measurements)
        ? (measurementsBody.measurements as ChildGrowthMeasurement[])
        : detail.measurements,
      milestoneChecks: Array.isArray(milestonesBody.milestoneChecks)
        ? (milestonesBody.milestoneChecks as ChildMilestoneCheck[])
        : detail.milestoneChecks,
      vaccineRecords: Array.isArray(vaccinesBody.vaccineRecords)
        ? (vaccinesBody.vaccineRecords as ChildVaccineRecord[])
        : detail.vaccineRecords,
      growthPeriods: Array.isArray(periodsBody.periods)
        ? (periodsBody.periods as ChildGrowthPeriod[])
        : Array.isArray(periodsBody.items)
          ? (periodsBody.items as ChildGrowthPeriod[])
          : detail.growthPeriods,
    };
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
        state.children = action.payload.children;
        state.limit = action.payload.limit;
        state.hasMore = action.payload.hasMore;
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
