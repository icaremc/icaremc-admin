import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import type { CreateAdminInput, UpdateAdminInput } from "@/lib/adminRoles";
import type { AdminUser } from "@/lib/types/database";

type AdminsState = {
  admins: AdminUser[];
  loading: boolean;
  saving: boolean;
  creating: boolean;
  error: string | null;
};

const initialState: AdminsState = {
  admins: [],
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

export const fetchAdmins = createAsyncThunk(
  "admins/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as AdminUser[];
  },
);

export const createAdmin = createAsyncThunk(
  "admins/create",
  async (payload: CreateAdminInput, { rejectWithValue }) => {
    const response = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }

    const body = (await response.json()) as { admin: AdminUser };
    return body.admin;
  },
);

export const updateAdmin = createAsyncThunk(
  "admins/update",
  async (payload: UpdateAdminInput, { rejectWithValue }) => {
    const response = await fetch("/api/admin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }

    const body = (await response.json()) as { admin: AdminUser };
    return body.admin;
  },
);

const adminsSlice = createSlice({
  name: "admins",
  initialState,
  reducers: {
    clearAdminsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdmins.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdmins.fulfilled, (state, action) => {
        state.loading = false;
        state.admins = action.payload;
      })
      .addCase(fetchAdmins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createAdmin.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createAdmin.fulfilled, (state, action) => {
        state.creating = false;
        state.admins = [action.payload, ...state.admins];
      })
      .addCase(createAdmin.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      .addCase(updateAdmin.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateAdmin.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.admins.findIndex(
          (admin) => admin.id === action.payload.id,
        );
        if (index >= 0) state.admins[index] = action.payload;
      })
      .addCase(updateAdmin.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const adminsReducer = adminsSlice.reducer;
export const adminsActions = adminsSlice.actions;
