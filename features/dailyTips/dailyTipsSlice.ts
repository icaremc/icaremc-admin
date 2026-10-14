import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/store";
import { rejectUnlessCanManage } from "@/lib/rejectUnlessCanManage";
import type { DailyTip, DailyTipTranslation, Locale } from "@/lib/types/database";

export type DailyTipFormTranslation = {
  title: string;
  content: string;
};

export type DailyTipFormState = {
  week_number: number;
  day_number: number | null;
  category: string;
  is_active: boolean;
  translations: Record<Locale, DailyTipFormTranslation>;
};

type DailyTipsState = {
  tips: DailyTip[];
  selected: DailyTip | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
};

function normalizeDailyTip(row: DailyTip & { daily_tip_translations_1?: DailyTipTranslation[] }): DailyTip {
  const translations =
    row.daily_tip_translations ??
    row.daily_tip_translations_1 ??
    [];
  return {
    ...row,
    daily_tip_translations: translations,
  };
}

const emptyTranslation = (): DailyTipFormTranslation => ({
  title: "",
  content: "",
});

function translationHasContent(slice: DailyTipFormTranslation): boolean {
  return slice.title.trim().length > 0 || slice.content.trim().length > 0;
}

export function tipToForm(tip: DailyTip): DailyTipFormState {
  const translations = (["en", "am", "om"] as Locale[]).reduce(
    (acc, locale) => {
      const row = tip.daily_tip_translations?.find(
        (item) => item.language_code === locale,
      );
      acc[locale] = {
        title: row?.title ?? "",
        content: row?.content ?? "",
      };
      return acc;
    },
    {} as Record<Locale, DailyTipFormTranslation>,
  );

  return {
    week_number: tip.week_number,
    day_number: tip.day_number,
    category: tip.category ?? "",
    is_active: tip.is_active,
    translations,
  };
}

export function formToTranslationRows(
  dailyTipId: string,
  form: DailyTipFormState,
): Omit<DailyTipTranslation, "id" | "created_at" | "updated_at">[] {
  return (["en", "am", "om"] as Locale[])
    .map((locale) => {
      const slice = form.translations[locale];
      if (!translationHasContent(slice)) return null;

      const content = slice.content.trim();
      const title =
        slice.title.trim() ||
        (content ? content.slice(0, 80) : `Week ${form.week_number} tip`);

      return {
        tip_id: dailyTipId,
        language_code: locale,
        title,
        content,
      };
    })
    .filter(Boolean) as Omit<
    DailyTipTranslation,
    "id" | "created_at" | "updated_at"
  >[];
}

export function validateDailyTipForm(form: DailyTipFormState): string | null {
  if (!form.translations.en.content.trim()) {
    return "English tip content is required.";
  }
  if (!Number.isInteger(form.week_number) || form.week_number < 1 || form.week_number > 42) {
    return "Pregnancy week must be between 1 and 42.";
  }
  if (
    form.day_number === null ||
    !Number.isInteger(form.day_number) ||
    form.day_number < 1 ||
    form.day_number > 7
  ) {
    return "Day in week must be between 1 and 7.";
  }
  return null;
}

function sortTips(tips: DailyTip[]): DailyTip[] {
  return [...tips].sort((a, b) => {
    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
    const dayA = a.day_number ?? 999;
    const dayB = b.day_number ?? 999;
    if (dayA !== dayB) return dayA - dayB;
    return a.created_at.localeCompare(b.created_at);
  });
}

const initialState: DailyTipsState = {
  tips: [],
  selected: null,
  loading: false,
  saving: false,
  error: null,
  success: null,
};

export const fetchDailyTips = createAsyncThunk(
  "dailyTips/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/daily-tips");
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return rejectWithValue(body.error ?? "Failed to load daily tips");
    }
    const body = (await response.json()) as { tips?: DailyTip[]; items?: DailyTip[] };
    return sortTips((body.tips ?? body.items ?? []).map(normalizeDailyTip));
  },
);

export const fetchDailyTip = createAsyncThunk(
  "dailyTips/fetchOne",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch("/api/admin/daily-tips");
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return rejectWithValue(body.error ?? "Failed to load daily tip");
    }
    const body = (await response.json()) as { tips?: DailyTip[]; items?: DailyTip[] };
    const tips = (body.tips ?? body.items ?? []).map(normalizeDailyTip);
    const found = tips.find((tip) => tip.id === id);
    if (!found) return rejectWithValue("Daily tip not found.");
    return found;
  },
);

export const saveDailyTip = createAsyncThunk(
  "dailyTips/save",
  async (
    payload: { id?: string; form: DailyTipFormState },
    { rejectWithValue, getState },
  ) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

    const validationError = validateDailyTipForm(payload.form);
    if (validationError) return rejectWithValue(validationError);

    const translations = formToTranslationRows("pending", payload.form).map(
      ({ language_code, title, content }) => ({ language_code, title, content }),
    );

    const body = {
      week_number: payload.form.week_number,
      day_number: payload.form.day_number,
      category: payload.form.category.trim() || null,
      is_active: payload.form.is_active,
      translations,
    };
    const response = await fetch(
      payload.id ? `/api/admin/daily-tips/${payload.id}` : "/api/admin/daily-tips",
      {
        method: payload.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { error?: string };
      return rejectWithValue(err.error ?? "Failed to save daily tip");
    }
    const result = (await response.json()) as { tip?: DailyTip; tips?: DailyTip[] };
    const tip = result.tip ?? result.tips?.[0];
    if (!tip) return rejectWithValue("Saved, but tip response was empty.");
    return normalizeDailyTip(tip);
  },
);

export const deleteDailyTip = createAsyncThunk(
  "dailyTips/delete",
  async (id: string, { rejectWithValue, getState }) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

    const response = await fetch(`/api/admin/daily-tips/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { error?: string };
      return rejectWithValue(err.error ?? "Failed to delete daily tip");
    }
    return id;
  },
);

export function createEmptyDailyTipForm(
  weekNumber?: number,
  dayNumber?: number | null,
): DailyTipFormState {
  return {
    week_number: weekNumber ?? 1,
    day_number: dayNumber ?? 1,
    category: "",
    is_active: true,
    translations: {
      en: emptyTranslation(),
      am: emptyTranslation(),
      om: emptyTranslation(),
    },
  };
}

const dailyTipsSlice = createSlice({
  name: "dailyTips",
  initialState,
  reducers: {
    clearDailyTipMessages(state) {
      state.error = null;
      state.success = null;
    },
    clearSelectedDailyTip(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyTips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDailyTips.fulfilled, (state, action) => {
        state.loading = false;
        state.tips = action.payload;
      })
      .addCase(fetchDailyTips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchDailyTip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDailyTip.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchDailyTip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(saveDailyTip.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = null;
      })
      .addCase(saveDailyTip.fulfilled, (state, action) => {
        state.saving = false;
        state.success = "Daily tip saved.";
        state.selected = action.payload;
        const index = state.tips.findIndex((tip) => tip.id === action.payload.id);
        if (index >= 0) state.tips[index] = action.payload;
        else state.tips.push(action.payload);
        state.tips = sortTips(state.tips);
      })
      .addCase(saveDailyTip.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteDailyTip.fulfilled, (state, action) => {
        state.tips = state.tips.filter((tip) => tip.id !== action.payload);
        state.success = "Daily tip deleted.";
      });
  },
});

export const dailyTipsReducer = dailyTipsSlice.reducer;
export const dailyTipsActions = dailyTipsSlice.actions;
