import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
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
    const [profileRes, pregnanciesRes, childrenRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("pregnancies")
        .select("*")
        .eq("user_id", userId)
        .order("pregnancy_number", { ascending: true }),
      supabase
        .from("children")
        .select("*")
        .eq("user_id", userId)
        .order("birth_date", { ascending: false }),
    ]);

    if (profileRes.error) return rejectWithValue(profileRes.error.message);
    if (pregnanciesRes.error) return rejectWithValue(pregnanciesRes.error.message);
    if (childrenRes.error) return rejectWithValue(childrenRes.error.message);

    const pregnancies = (pregnanciesRes.data ?? []) as Pregnancy[];
    const pregnancyIds = pregnancies.map((p) => p.id);

    const logsByPregnancy: Record<string, PregnancyLog[]> = {};
    if (pregnancyIds.length > 0) {
      const { data: logs, error: logsError } = await supabase
        .from("pregnancy_logs")
        .select("*")
        .in("pregnancy_id", pregnancyIds)
        .order("week_number", { ascending: true });

      if (logsError) return rejectWithValue(logsError.message);

      for (const log of (logs ?? []) as PregnancyLog[]) {
        logsByPregnancy[log.pregnancy_id] ??= [];
        logsByPregnancy[log.pregnancy_id].push(log);
      }
    }

    return {
      profile: profileRes.data as Profile,
      pregnancies,
      logsByPregnancy,
      children: (childrenRes.data ?? []) as Child[],
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

export const userDetailActions = userDetailSlice.actions;
export const userDetailReducer = userDetailSlice.reducer;
