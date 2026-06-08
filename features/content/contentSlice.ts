import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dailyTipDayNumber, dailyTipWeekNumber } from "@/lib/content/contentLabels";
import { supabase } from "@/lib/supabaseClient";
import type {
  ContentNamespace,
  ContentTranslation,
} from "@/lib/types/database";

function sortDailyTips(items: ContentTranslation[]): ContentTranslation[] {
  return [...items].sort((a, b) => {
    const weekA = dailyTipWeekNumber(a) ?? 999;
    const weekB = dailyTipWeekNumber(b) ?? 999;
    if (weekA !== weekB) return weekA - weekB;
    const dayA = dailyTipDayNumber(a) ?? 999;
    const dayB = dailyTipDayNumber(b) ?? 999;
    if (dayA !== dayB) return dayA - dayB;
    return a.created_at.localeCompare(b.created_at);
  });
}

type ContentState = {
  items: ContentTranslation[];
  selected: ContentTranslation | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
};

const initialState: ContentState = {
  items: [],
  selected: null,
  loading: false,
  saving: false,
  error: null,
  success: null,
};

export const fetchContentByNamespace = createAsyncThunk(
  "content/fetchByNamespace",
  async (namespace: ContentNamespace, { rejectWithValue }) => {
    const query = supabase
      .from("content_translations")
      .select("*")
      .eq("namespace", namespace);

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) return rejectWithValue(error.message);
    const items = (data ?? []) as ContentTranslation[];
    return namespace === "daily_tip" ? sortDailyTips(items) : items;
  },
);

export const fetchContentItem = createAsyncThunk(
  "content/fetchItem",
  async (
    { namespace, entityId }: { namespace: ContentNamespace; entityId: string },
    { rejectWithValue },
  ) => {
    const { data, error } = await supabase
      .from("content_translations")
      .select("*")
      .eq("namespace", namespace)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (error) return rejectWithValue(error.message);
    if (!data) return rejectWithValue("Content item not found.");
    return data as ContentTranslation;
  },
);

export const saveContentItem = createAsyncThunk(
  "content/saveItem",
  async (
    payload: {
      id?: string;
      namespace: ContentNamespace;
      entityId: string;
      translations: Record<string, Record<string, unknown>>;
      isPublished: boolean;
    },
    { rejectWithValue },
  ) => {
    const row = {
      namespace: payload.namespace,
      entity_id: payload.entityId,
      translations: payload.translations,
      is_published: payload.isPublished,
    };

    const { data, error } = payload.id
      ? await supabase
          .from("content_translations")
          .update(row)
          .eq("id", payload.id)
          .select("*")
          .single()
      : await supabase
          .from("content_translations")
          .insert(row)
          .select("*")
          .single();

    if (error) return rejectWithValue(error.message);
    return data as ContentTranslation;
  },
);

export const deleteContentItem = createAsyncThunk(
  "content/deleteItem",
  async (id: string, { rejectWithValue }) => {
    const { error } = await supabase
      .from("content_translations")
      .delete()
      .eq("id", id);

    if (error) return rejectWithValue(error.message);
    return id;
  },
);

const contentSlice = createSlice({
  name: "content",
  initialState,
  reducers: {
    clearContentMessages(state) {
      state.error = null;
      state.success = null;
    },
    clearSelectedContent(state) {
      state.selected = null;
    },
    setSelectedContent(state, action: PayloadAction<ContentTranslation | null>) {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContentByNamespace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentByNamespace.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchContentByNamespace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchContentItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentItem.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchContentItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(saveContentItem.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = null;
      })
      .addCase(saveContentItem.fulfilled, (state, action) => {
        state.saving = false;
        state.success = "Content saved.";
        state.selected = action.payload;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) {
          state.items[index] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(saveContentItem.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteContentItem.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.success = "Content deleted.";
      });
  },
});

export const contentReducer = contentSlice.reducer;
export const contentActions = contentSlice.actions;
