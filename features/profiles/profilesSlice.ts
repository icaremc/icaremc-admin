import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/store";
import { DEFAULT_PAGE_SIZE } from "@/lib/listPagination";
import { rejectUnlessCanManage } from "@/lib/rejectUnlessCanManage";
import type { CreateUserInput, AppUserRole } from "@/lib/roles";
import type { Profile } from "@/lib/types/database";

type ProfilesState = {
  profiles: Profile[];
  loading: boolean;
  saving: boolean;
  creating: boolean;
  error: string | null;
  offset: number;
  limit: number;
  total: number | null;
  hasMore: boolean;
};

const initialState: ProfilesState = {
  profiles: [],
  loading: false,
  saving: false,
  creating: false,
  error: null,
  offset: 0,
  limit: DEFAULT_PAGE_SIZE,
  total: null,
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

export const fetchProfiles = createAsyncThunk(
  "profiles/fetchAll",
  async (
    args: { offset?: number; limit?: number } | undefined,
    { rejectWithValue },
  ) => {
    const limit = args?.limit ?? DEFAULT_PAGE_SIZE;
    const offset = args?.offset ?? 0;

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const response = await fetch(`/api/admin/users?${params.toString()}`);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return rejectWithValue(body.error ?? "Failed to load users");
    }
    const body = (await response.json()) as {
      profiles?: Profile[];
      items?: Profile[];
      pagination?: {
        total: number | null;
        offset: number;
        limit: number;
        hasMore: boolean;
      };
    };
    const profiles = (body.profiles ?? body.items ?? []) as Profile[];
    const pagination = body.pagination ?? {
      total: null,
      offset,
      limit,
      hasMore: profiles.length >= limit,
    };
    return { profiles, pagination };
  },
);

export const createUser = createAsyncThunk(
  "profiles/createUser",
  async (payload: CreateUserInput, { rejectWithValue, getState }) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_users",
    );
    if (denied) return rejectWithValue(denied);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }

    const body = (await response.json()) as { profile: Profile };
    return body.profile;
  },
);

export const updateProfileRole = createAsyncThunk<
  Profile,
  { id: string; role: AppUserRole },
  { rejectValue: string }
>("profiles/updateRole", async (payload, { rejectWithValue, getState }) => {
  const denied = rejectUnlessCanManage(
    (getState() as RootState).auth.user?.adminRole,
    "manage_users",
  );
  if (denied) return rejectWithValue(denied);

  void payload;
  return rejectWithValue(
    "Updating parent role is not available on api.icaremchealth.com yet.",
  );
});

const profilesSlice = createSlice({
  name: "profiles",
  initialState,
  reducers: {
    clearProfilesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfiles.fulfilled, (state, action) => {
        state.loading = false;
        state.profiles = action.payload.profiles;
        state.offset = action.payload.pagination.offset;
        state.limit = action.payload.pagination.limit;
        state.total = action.payload.pagination.total;
        state.hasMore = action.payload.pagination.hasMore;
      })
      .addCase(fetchProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createUser.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.creating = false;
        state.profiles = [action.payload, ...state.profiles];
      })
      .addCase(createUser.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      .addCase(updateProfileRole.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateProfileRole.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.profiles.findIndex(
          (profile) => profile.id === action.payload.id,
        );
        if (index >= 0) state.profiles[index] = action.payload;
      })
      .addCase(updateProfileRole.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const profilesReducer = profilesSlice.reducer;
export const profilesActions = profilesSlice.actions;
