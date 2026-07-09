import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import type { Child, ChildMilestone, ChildUpdatePayload } from "@/lib/types/database";

const CHILD_SELECT = "*, profiles(full_name, phone)";

export type ChildDetailPayload = {
  child: Child;
  milestones: ChildMilestone[];
};

type ChildrenState = {
  children: Child[];
  selected: ChildDetailPayload | null;
  loading: boolean;
  detailLoading: boolean;
  saving: boolean;
  error: string | null;
};

const initialState: ChildrenState = {
  children: [],
  selected: null,
  loading: false,
  detailLoading: false,
  saving: false,
  error: null,
};

export const fetchChildren = createAsyncThunk(
  "children/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("children")
      .select(CHILD_SELECT)
      .order("updated_at", { ascending: false });

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as Child[];
  },
);

export const fetchChildDetail = createAsyncThunk(
  "children/fetchDetail",
  async (childId: string, { rejectWithValue }) => {
    const [childRes, milestonesRes] = await Promise.all([
      supabase.from("children").select(CHILD_SELECT).eq("id", childId).single(),
      supabase
        .from("child_milestones")
        .select("*")
        .eq("child_id", childId)
        .order("achieved_date", { ascending: false, nullsFirst: false }),
    ]);

    if (childRes.error) return rejectWithValue(childRes.error.message);
    if (milestonesRes.error) return rejectWithValue(milestonesRes.error.message);

    return {
      child: childRes.data as Child,
      milestones: (milestonesRes.data ?? []) as ChildMilestone[],
    } satisfies ChildDetailPayload;
  },
);

export const updateChild = createAsyncThunk(
  "children/update",
  async (
    { childId, patch }: { childId: string; patch: ChildUpdatePayload },
    { rejectWithValue },
  ) => {
    const { data, error } = await supabase
      .from("children")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", childId)
      .select(CHILD_SELECT)
      .single();

    if (error) return rejectWithValue(error.message);
    return data as Child;
  },
);

const childrenSlice = createSlice({
  name: "children",
  initialState,
  reducers: {
    clearChildDetail(state) {
      state.selected = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChildren.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChildren.fulfilled, (state, action) => {
        state.loading = false;
        state.children = action.payload;
      })
      .addCase(fetchChildren.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchChildDetail.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchChildDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = action.payload;
      })
      .addCase(fetchChildDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateChild.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateChild.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload;
        state.children = state.children.map((c) =>
          c.id === updated.id ? updated : c,
        );
        if (state.selected?.child.id === updated.id) {
          state.selected = { ...state.selected, child: updated };
        }
      })
      .addCase(updateChild.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const childrenActions = childrenSlice.actions;
export const childrenReducer = childrenSlice.reducer;
