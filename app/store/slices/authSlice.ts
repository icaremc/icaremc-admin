import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AdminRole } from "@/lib/types/database";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  adminRole: AdminRole | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  token: null,
  status: "idle",
  error: null,
};

function asAdminRole(value: string | null | undefined): AdminRole | null {
  if (
    value === "super_admin" ||
    value === "content_admin" ||
    value === "support" ||
    value === "viewer"
  ) {
    return value;
  }
  if (value === "admin" || value === "content_editor") return "support";
  return value ? "support" : null;
}

export const login = createAsyncThunk<
  { user: AuthUser; token: string },
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async ({ email, password }, { rejectWithValue }) => {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed || !password) {
    return rejectWithValue("Email and password are required.");
  }

  const response = await fetch("/api/backend/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: trimmed, password }),
  });
  const payload = (await response.json()) as {
    error?: string;
    token?: string;
    user?: { id: string; email: string; name: string; adminRole: string | null };
  };
  if (!response.ok || !payload.token || !payload.user) {
    return rejectWithValue(payload.error ?? "Login failed.");
  }
  return {
    token: payload.token,
    user: {
      id: payload.user.id,
      email: payload.user.email,
      name: payload.user.name,
      adminRole: asAdminRole(payload.user.adminRole),
    },
  };
});

export const restoreSession = createAsyncThunk<
  { user: AuthUser; token: string } | null,
  void,
  { rejectValue: string }
>("auth/restoreSession", async (_, { rejectWithValue }) => {
  try {
    const response = await fetch("/api/backend/auth/session", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      token?: string;
      user?: {
        id: string;
        email: string;
        name: string;
        adminRole: string | null;
      };
    };
    if (!payload.token || !payload.user) return null;
    return {
      token: payload.token,
      user: {
        id: payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        adminRole: asAdminRole(payload.user.adminRole),
      },
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to restore session",
    );
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = "idle";
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Login failed.";
      })
      .addCase(restoreSession.pending, (state) => {
        state.status = "loading";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = "authenticated";
          state.user = action.payload.user;
          state.token = action.payload.token;
        } else {
          state.status = "idle";
          state.user = null;
          state.token = null;
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = "idle";
        state.user = null;
        state.token = null;
      });
  },
});

export const authReducer = authSlice.reducer;
export const authActions = authSlice.actions;
