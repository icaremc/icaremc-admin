import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/store";
import { rejectUnlessCanManage } from "@/lib/rejectUnlessCanManage";
import type {
  ContentNamespace,
  ContentTranslation,
} from "@/lib/types/database";

const CONTENT_API_UNAVAILABLE =
  "Content translations are not available on the admin API yet.";

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

export const fetchContentByNamespace = createAsyncThunk<
  ContentTranslation[],
  ContentNamespace,
  { rejectValue: string }
>("content/fetchByNamespace", async (_namespace, { rejectWithValue }) => {
  return rejectWithValue(CONTENT_API_UNAVAILABLE);
});

export const fetchContentItem = createAsyncThunk<
  ContentTranslation,
  { namespace: ContentNamespace; entityId: string },
  { rejectValue: string }
>("content/fetchItem", async (_payload, { rejectWithValue }) => {
  return rejectWithValue(CONTENT_API_UNAVAILABLE);
});

export const saveContentItem = createAsyncThunk<
  ContentTranslation,
  {
    id?: string;
    namespace: ContentNamespace;
    entityId: string;
    translations: Record<string, Record<string, unknown>>;
    isPublished: boolean;
  },
  { rejectValue: string }
>("content/saveItem", async (_payload, { rejectWithValue, getState }) => {
  const denied = rejectUnlessCanManage(
    (getState() as RootState).auth.user?.adminRole,
    "manage_content",
  );
  if (denied) return rejectWithValue(denied);

  return rejectWithValue(CONTENT_API_UNAVAILABLE);
});

export const deleteContentItem = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("content/deleteItem", async (_id, { rejectWithValue, getState }) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

  return rejectWithValue(CONTENT_API_UNAVAILABLE);
});

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
