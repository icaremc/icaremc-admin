import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import type { Mother } from "@/lib/types/database";

type MothersState = {
  mothers: Mother[];
  loading: boolean;
  error: string | null;
};

const initialState: MothersState = {
  mothers: [],
  loading: false,
  error: null,
};

export const fetchMothers = createAsyncThunk(
  "mothers/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("mothers")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as Mother[];
  },
);

const mothersSlice = createSlice({
  name: "mothers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMothers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMothers.fulfilled, (state, action) => {
        state.loading = false;
        state.mothers = action.payload;
      })
      .addCase(fetchMothers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const mothersReducer = mothersSlice.reducer;
