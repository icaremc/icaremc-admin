import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import type { Pregnancy } from "@/lib/types/database";

type PregnanciesState = {
  pregnancies: Pregnancy[];
  loading: boolean;
  error: string | null;
};

const initialState: PregnanciesState = {
  pregnancies: [],
  loading: false,
  error: null,
};

export const fetchPregnancies = createAsyncThunk(
  "pregnancies/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("pregnancies")
      .select("*, profiles(full_name, phone)")
      .order("updated_at", { ascending: false });

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as Pregnancy[];
  },
);

const pregnanciesSlice = createSlice({
  name: "pregnancies",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPregnancies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPregnancies.fulfilled, (state, action) => {
        state.loading = false;
        state.pregnancies = action.payload;
      })
      .addCase(fetchPregnancies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const pregnanciesReducer = pregnanciesSlice.reducer;
