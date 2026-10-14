import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Child, Pregnancy, PregnancyLog, Profile } from "@/lib/types/database";

export type UserDetailPayload = {
  profile: Profile;
  pregnancies: Pregnancy[];
  logsByPregnancy: Record<string, PregnancyLog[]>;
  children: Child[];
};

type UserDetailState = {
  userId: string | null;
  detail: UserDetailPayload | null;
  loading: boolean;
  error: string | null;
};

const initialState: UserDetailState = {
  userId: null,
  detail: null,
  loading: false,
  error: null,
};

export const fetchUserDetail = createAsyncThunk(
  "userDetail/fetch",
  async (userId: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/users/${userId}`);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return rejectWithValue(body.error ?? "Failed to load user");
    }
    const body = (await response.json()) as {
      profile?: Profile;
      pregnancies?: Pregnancy[];
      children?: Child[];
      logsByPregnancy?: Record<string, PregnancyLog[]>;
    };
    if (!body.profile) return rejectWithValue("User not found");
    return {
      profile: body.profile,
      pregnancies: body.pregnancies ?? [],
      children: body.children ?? [],
      logsByPregnancy: body.logsByPregnancy ?? {},
    } satisfies UserDetailPayload;
  },
);

const userDetailSlice = createSlice({
  name: "userDetail",
  initialState,
  reducers: {
    clearUserDetail(state) {
      state.userId = null;
      state.detail = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserDetail.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.userId = action.meta.arg;
      })
      .addCase(fetchUserDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.detail = action.payload;
      })
      .addCase(fetchUserDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearUserDetail } = userDetailSlice.actions;
export const userDetailReducer = userDetailSlice.reducer;
