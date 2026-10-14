import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/store";
import { LOCALES } from "@/lib/constants";
import { rejectUnlessCanManage } from "@/lib/rejectUnlessCanManage";
import type {
  GrowthClinicalAdvice,
  Locale,
} from "@/lib/types/database";

export type ClinicalAdviceTranslationForm = {
  explain_text: string;
  causes: string;
  recommendations: string;
};

export type ClinicalAdviceFormState = {
  id: string;
  code: string;
  metric: string;
  condition: string;
  min_age_months: number;
  max_age_months: number;
  sort_order: number;
  is_active: boolean;
  translations: Record<Locale, ClinicalAdviceTranslationForm>;
};

type GrowthClinicalAdviceState = {
  items: GrowthClinicalAdvice[];
  selected: GrowthClinicalAdvice | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
};

const emptyTranslation = (): ClinicalAdviceTranslationForm => ({
  explain_text: "",
  causes: "",
  recommendations: "",
});

export function emptyClinicalAdviceForm(): ClinicalAdviceFormState {
  return {
    id: "",
    code: "wfa_low",
    metric: "weight",
    condition: "low",
    min_age_months: 0,
    max_age_months: 240,
    sort_order: 0,
    is_active: true,
    translations: {
      en: emptyTranslation(),
      am: emptyTranslation(),
      om: emptyTranslation(),
    },
  };
}

export function adviceToForm(advice: GrowthClinicalAdvice): ClinicalAdviceFormState {
  const form = emptyClinicalAdviceForm();
  form.id = advice.id;
  form.code = advice.code;
  form.metric = advice.metric;
  form.condition = advice.condition;
  form.min_age_months = advice.min_age_months;
  form.max_age_months = advice.max_age_months;
  form.sort_order = advice.sort_order;
  form.is_active = advice.is_active;

  for (const row of advice.growth_clinical_advice_translations ?? []) {
    if (!LOCALES.includes(row.language_code as Locale)) continue;
    form.translations[row.language_code as Locale] = {
      explain_text: row.explain_text ?? "",
      causes: row.causes ?? "",
      recommendations: row.recommendations ?? "",
    };
  }

  return form;
}

function formToTranslationRows(
  adviceId: string,
  form: ClinicalAdviceFormState,
): Array<{
  advice_id: string;
  language_code: Locale;
  explain_text: string;
  causes: string;
  recommendations: string;
}> {
  return LOCALES.flatMap((locale) => {
    const slice = form.translations[locale];
    const explain_text = slice.explain_text.trim();
    const causes = slice.causes.trim();
    const recommendations = slice.recommendations.trim();
    if (!explain_text && !causes && !recommendations) return [];
    return [
      {
        advice_id: adviceId,
        language_code: locale,
        explain_text,
        causes,
        recommendations,
      },
    ];
  });
}

const initialState: GrowthClinicalAdviceState = {
  items: [],
  selected: null,
  loading: false,
  saving: false,
  error: null,
  success: null,
};

export const fetchGrowthClinicalAdvice = createAsyncThunk(
  "growthClinicalAdvice/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/clinical-advice");
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return rejectWithValue(body.error ?? "Failed to load clinical advice");
    }
    const body = (await response.json()) as {
      items?: GrowthClinicalAdvice[];
      advice?: GrowthClinicalAdvice[];
    };
    const items = body.items ?? body.advice ?? [];
    return [...items].sort((a, b) => a.sort_order - b.sort_order);
  },
);

export const fetchGrowthClinicalAdviceById = createAsyncThunk(
  "growthClinicalAdvice/fetchOne",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch("/api/admin/clinical-advice");
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return rejectWithValue(body.error ?? "Failed to load clinical advice");
    }
    const body = (await response.json()) as {
      items?: GrowthClinicalAdvice[];
      advice?: GrowthClinicalAdvice[];
    };
    const found = (body.items ?? body.advice ?? []).find((item) => item.id === id);
    if (!found) return rejectWithValue("Clinical advice not found.");
    return found;
  },
);

export const saveGrowthClinicalAdvice = createAsyncThunk(
  "growthClinicalAdvice/save",
  async (form: ClinicalAdviceFormState, { rejectWithValue, getState }) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

    if (!form.translations.en.explain_text.trim()) {
      return rejectWithValue("English explanation is required.");
    }
    if (form.min_age_months < 0 || form.max_age_months < form.min_age_months) {
      return rejectWithValue("Age range must be valid (max ≥ min, min ≥ 0).");
    }

    const code = form.code
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const metric = form.metric.trim();
    const condition = form.condition.trim();

    if (!code) return rejectWithValue("Code is required (e.g. wfa_low).");
    if (!metric) return rejectWithValue("Metric is required.");
    if (!condition) return rejectWithValue("Condition is required.");

    const translations = formToTranslationRows(form.id || "pending", form).map(
      ({ language_code, explain_text, causes, recommendations }) => ({
        language_code,
        explain_text,
        causes,
        recommendations,
      }),
    );
    const payload = {
      code,
      metric,
      condition,
      min_age_months: form.min_age_months,
      max_age_months: form.max_age_months,
      sort_order: form.sort_order,
      is_active: form.is_active,
      translations,
    };
    const response = await fetch(
      form.id ? `/api/admin/clinical-advice/${form.id}` : "/api/admin/clinical-advice",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { error?: string };
      return rejectWithValue(err.error ?? "Failed to save clinical advice");
    }
    const body = (await response.json()) as {
      item?: GrowthClinicalAdvice;
      items?: GrowthClinicalAdvice[];
    };
    return body.item ?? body.items?.[0] ?? (body as GrowthClinicalAdvice);
  },
);

const growthClinicalAdviceSlice = createSlice({
  name: "growthClinicalAdvice",
  initialState,
  reducers: {
    clearGrowthClinicalAdviceMessages(state) {
      state.error = null;
      state.success = null;
    },
    clearSelectedGrowthClinicalAdvice(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGrowthClinicalAdvice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGrowthClinicalAdvice.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchGrowthClinicalAdvice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchGrowthClinicalAdviceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGrowthClinicalAdviceById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(fetchGrowthClinicalAdviceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(saveGrowthClinicalAdvice.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = null;
      })
      .addCase(saveGrowthClinicalAdvice.fulfilled, (state, action) => {
        state.saving = false;
        state.selected = action.payload;
        state.success = "Clinical advice saved.";
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
        else state.items.push(action.payload);
        state.items.sort((a, b) => a.sort_order - b.sort_order);
      })
      .addCase(saveGrowthClinicalAdvice.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const growthClinicalAdviceActions = growthClinicalAdviceSlice.actions;
export const growthClinicalAdviceReducer = growthClinicalAdviceSlice.reducer;
