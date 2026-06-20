import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import { accountTypeForRole, type CreateUserInput, type AppUserRole } from "@/lib/roles";
import type { Profile } from "@/lib/types/database";

type ProfilesState = {
  profiles: Profile[];
  loading: boolean;
  saving: boolean;
  creating: boolean;
  error: string | null;
};

const initialState: ProfilesState = {
  profiles: [],
  loading: false,
  saving: false,
  creating: false,
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

export const fetchProfiles = createAsyncThunk(
  "profiles/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "mother")
      .order("created_at", { ascending: false });

    if (profilesError) return rejectWithValue(profilesError.message);

    return (profiles ?? []) as Profile[];
  },
);

export const createUser = createAsyncThunk(
  "profiles/createUser",
  async (payload: CreateUserInput, { rejectWithValue }) => {
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

export const updateProfileRole = createAsyncThunk(
  "profiles/updateRole",
  async (
    payload: { id: string; role: AppUserRole },
    { rejectWithValue },
  ) => {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        role: payload.role,
        account_type: accountTypeForRole(payload.role),
        is_admin: false,
      })
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) return rejectWithValue(error.message);
    return data as Profile;
  },
);

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
        state.profiles = action.payload;
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
