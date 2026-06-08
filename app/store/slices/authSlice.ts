import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/authConfig";

type AuthUser = {
  id: string;
  name: string;
  email: string;
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

export const login = createAsyncThunk<
  { user: AuthUser; token: string },
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async ({ email, password }, { rejectWithValue }) => {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed || !password) {
    return rejectWithValue("Email and password are required.");
  }

  if (!isAdminEmail(trimmed)) {
    return rejectWithValue("This account is not authorized for admin access.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmed,
    password,
  });

  if (error) {
    return rejectWithValue(error.message);
  }

  if (!data.session || !data.user) {
    return rejectWithValue("Login failed. No session returned.");
  }

  const name =
    (data.user.user_metadata?.full_name as string | undefined) ??
    data.user.email?.split("@")[0] ??
    "Admin";

  return {
    user: {
      id: data.user.id,
      name,
      email: data.user.email ?? trimmed,
    },
    token: data.session.access_token,
  };
});

export const restoreSession = createAsyncThunk<
  { user: AuthUser; token: string } | null,
  void,
  { rejectValue: string }
>("auth/restoreSession", async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return rejectWithValue(error.message);
  }

  const session = data.session;
  if (!session?.user?.email) return null;

  if (!isAdminEmail(session.user.email)) {
    await supabase.auth.signOut();
    return null;
  }

  const name =
    (session.user.user_metadata?.full_name as string | undefined) ??
    session.user.email.split("@")[0] ??
    "Admin";

  return {
    user: {
      id: session.user.id,
      name,
      email: session.user.email,
    },
    token: session.access_token,
  };
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
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
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
