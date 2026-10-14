import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
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
    const response = await fetch("/api/admin/pregnancies");
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return rejectWithValue(body.error ?? "Failed to load pregnancies");
    }
    const body = (await response.json()) as { pregnancies?: Pregnancy[] };
    return (body.pregnancies ?? []) as Pregnancy[];
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
