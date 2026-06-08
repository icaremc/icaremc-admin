import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import type { ChildProfile } from "@/lib/types/database";

type ChildrenState = {
  children: ChildProfile[];
  loading: boolean;
  error: string | null;
};

const initialState: ChildrenState = {
  children: [],
  loading: false,
  error: null,
};

export const fetchChildProfiles = createAsyncThunk(
  "children/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("child_profiles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as ChildProfile[];
  },
);

const childrenSlice = createSlice({
  name: "children",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchChildProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChildProfiles.fulfilled, (state, action) => {
        state.loading = false;
        state.children = action.payload;
      })
      .addCase(fetchChildProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const childrenReducer = childrenSlice.reducer;
