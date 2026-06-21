import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  EMPTY_GROWTH,
  EMPTY_MILESTONE_CATEGORY,
  EMPTY_PREGNANCY_SECTION,
  type GrowthFields,
  type MilestoneCategoryFields,
  type PregnancySectionFields,
} from "@/lib/content/formTypes";
import {
  ageGroupForMonths,
  type ChildAgeGroup,
} from "@/lib/childGrowth/periods";
import { supabase } from "@/lib/supabaseClient";
import type {
  ChildGrowthGrowthData,
  ChildGrowthMilestoneCategory,
  ChildGrowthPeriod,
  ChildGrowthPeriodTranslation,
  Locale,
  PregnancyWeekSection,
} from "@/lib/types/database";

export type ChildGrowthFormGrowth = {
  notes: string;
  boys: GrowthFields;
  girls: GrowthFields;
};

export type ChildGrowthPeriodFormTranslation = {
  title: string;
  subtitle: string;
  growth: ChildGrowthFormGrowth;
  vaccines: PregnancySectionFields[];
  milestones: MilestoneCategoryFields[];
  red_flags: PregnancySectionFields[];
  nutrition: PregnancySectionFields[];
  visit_reminders: PregnancySectionFields[];
};

export type ChildGrowthPeriodFormState = {
  age_months: number;
  age_label: string;
  age_group: ChildAgeGroup;
  image_note: string;
  is_published: boolean;
  translations: Record<Locale, ChildGrowthPeriodFormTranslation>;
};

type ChildGrowthState = {
  periods: ChildGrowthPeriod[];
  selected: ChildGrowthPeriod | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
};

const emptyGrowth = (): ChildGrowthFormGrowth => ({
  notes: "",
  boys: { ...EMPTY_GROWTH },
  girls: { ...EMPTY_GROWTH },
});

const emptyTranslation = (): ChildGrowthPeriodFormTranslation => ({
  title: "",
  subtitle: "",
  growth: emptyGrowth(),
  vaccines: [{ ...EMPTY_PREGNANCY_SECTION }],
  milestones: [{ ...EMPTY_MILESTONE_CATEGORY }],
  red_flags: [{ ...EMPTY_PREGNANCY_SECTION }],
  nutrition: [{ ...EMPTY_PREGNANCY_SECTION }],
  visit_reminders: [{ ...EMPTY_PREGNANCY_SECTION }],
});

function parseSections(raw: unknown): PregnancySectionFields[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ ...EMPTY_PREGNANCY_SECTION }];
  }
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const map = item as Record<string, unknown>;
      const bullets = map.bullets;
      return {
        title: typeof map.title === "string" ? map.title : "",
        body: typeof map.body === "string" ? map.body : "",
        bulletsText: Array.isArray(bullets)
          ? bullets.map((b) => String(b)).join("\n")
          : "",
        is_urgent: map.is_urgent === true,
      };
    });
}

function parseGrowthFields(raw: unknown): GrowthFields {
  if (!raw || typeof raw !== "object") return { ...EMPTY_GROWTH };
  const map = raw as Record<string, unknown>;
  return {
    weight_range: typeof map.weight_range === "string" ? map.weight_range : "",
    length_range: typeof map.length_range === "string" ? map.length_range : "",
    head_circumference_range:
      typeof map.head_circumference_range === "string"
        ? map.head_circumference_range
        : "",
    weight_average:
      typeof map.weight_average === "string" ? map.weight_average : "",
    length_average:
      typeof map.length_average === "string" ? map.length_average : "",
    head_average: typeof map.head_average === "string" ? map.head_average : "",
  };
}

function parseGrowth(raw: unknown): ChildGrowthFormGrowth {
  if (!raw || typeof raw !== "object") return emptyGrowth();
  const map = raw as Record<string, unknown>;
  return {
    notes: typeof map.notes === "string" ? map.notes : "",
    boys: parseGrowthFields(map.boys),
    girls: parseGrowthFields(map.girls),
  };
}

function parseMilestones(raw: unknown): MilestoneCategoryFields[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ ...EMPTY_MILESTONE_CATEGORY }];
  }
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const map = item as Record<string, unknown>;
      const items = map.items;
      return {
        title: typeof map.title === "string" ? map.title : "",
        itemsText: Array.isArray(items)
          ? items.map((b) => String(b)).join("\n")
          : "",
      };
    });
}

function serializeSections(
  sections: PregnancySectionFields[],
): PregnancyWeekSection[] {
  return sections
    .filter(
      (section) =>
        section.title.trim() ||
        section.body.trim() ||
        section.bulletsText.trim(),
    )
    .map((section) => ({
      title: section.title.trim(),
      body: section.body.trim(),
      bullets: section.bulletsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      is_urgent: section.is_urgent,
    }));
}

function serializeGrowthFields(fields: GrowthFields) {
  const hasValue = Object.values(fields).some((v) => v.trim());
  if (!hasValue) return undefined;
  return {
    weight_range: fields.weight_range.trim() || undefined,
    length_range: fields.length_range.trim() || undefined,
    head_circumference_range: fields.head_circumference_range.trim() || undefined,
    weight_average: fields.weight_average.trim() || undefined,
    length_average: fields.length_average.trim() || undefined,
    head_average: fields.head_average.trim() || undefined,
  };
}

function serializeGrowth(growth: ChildGrowthFormGrowth): ChildGrowthGrowthData {
  const boys = serializeGrowthFields(growth.boys);
  const girls = serializeGrowthFields(growth.girls);
  const notes = growth.notes.trim() || undefined;
  if (!notes && !boys && !girls) return {};
  return {
    notes,
    boys,
    girls,
  };
}

function serializeMilestones(
  categories: MilestoneCategoryFields[],
): ChildGrowthMilestoneCategory[] {
  return categories
    .filter((category) => category.title.trim() || category.itemsText.trim())
    .map((category) => ({
      title: category.title.trim(),
      items: category.itemsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
}

function translationHasContent(
  slice: ChildGrowthPeriodFormTranslation,
): boolean {
  if (slice.title.trim() || slice.subtitle.trim()) return true;
  if (slice.growth.notes.trim()) return true;
  if (
    [slice.growth.boys, slice.growth.girls].some((sex) =>
      Object.values(sex).some((v) => v.trim()),
    )
  ) {
    return true;
  }
  const sectionGroups = [
    slice.vaccines,
    slice.red_flags,
    slice.nutrition,
    slice.visit_reminders,
  ];
  if (
    sectionGroups.some((group) =>
      group.some(
        (section) =>
          section.title.trim() ||
          section.body.trim() ||
          section.bulletsText.trim(),
      ),
    )
  ) {
    return true;
  }
  return slice.milestones.some(
    (category) => category.title.trim() || category.itemsText.trim(),
  );
}

export function periodToForm(period: ChildGrowthPeriod): ChildGrowthPeriodFormState {
  const translations = (["en", "am", "om"] as Locale[]).reduce(
    (acc, locale) => {
      const row = period.child_growth_period_translations?.find(
        (item) => item.language_code === locale,
      );
      acc[locale] = {
        title: row?.title ?? "",
        subtitle: row?.subtitle ?? "",
        growth: parseGrowth(row?.growth),
        vaccines: parseSections(row?.vaccines),
        milestones: parseMilestones(row?.milestones),
        red_flags: parseSections(row?.red_flags),
        nutrition: parseSections(row?.nutrition),
        visit_reminders: parseSections(row?.visit_reminders),
      };
      return acc;
    },
    {} as Record<Locale, ChildGrowthPeriodFormTranslation>,
  );

  return {
    age_months: period.age_months,
    age_label: period.age_label,
    age_group: (period.age_group as ChildAgeGroup) || ageGroupForMonths(period.age_months),
    image_note: period.image_note ?? "",
    is_published: period.is_published,
    translations,
  };
}

export function createEmptyForm(
  ageMonths: number,
  ageLabel = "",
): ChildGrowthPeriodFormState {
  const makeTranslation = (): ChildGrowthPeriodFormTranslation => ({
    ...emptyTranslation(),
    growth: emptyGrowth(),
    vaccines: [{ ...EMPTY_PREGNANCY_SECTION }],
    milestones: [{ ...EMPTY_MILESTONE_CATEGORY }],
    red_flags: [{ ...EMPTY_PREGNANCY_SECTION }],
    nutrition: [{ ...EMPTY_PREGNANCY_SECTION }],
    visit_reminders: [{ ...EMPTY_PREGNANCY_SECTION }],
  });

  return {
    age_months: ageMonths,
    age_label: ageLabel,
    age_group: ageGroupForMonths(ageMonths),
    image_note: "",
    is_published: true,
    translations: {
      en: makeTranslation(),
      am: makeTranslation(),
      om: makeTranslation(),
    },
  };
}

function formToTranslationRows(
  periodId: string,
  form: ChildGrowthPeriodFormState,
): Omit<ChildGrowthPeriodTranslation, "id" | "created_at" | "updated_at">[] {
  return (["en", "am", "om"] as Locale[])
    .map((locale) => {
      const slice = form.translations[locale];
      if (!translationHasContent(slice)) return null;

      return {
        period_id: periodId,
        language_code: locale,
        title: slice.title.trim() || form.age_label.trim() || `Age ${form.age_months} months`,
        subtitle: slice.subtitle.trim() || null,
        growth: serializeGrowth(slice.growth),
        vaccines: serializeSections(slice.vaccines),
        milestones: serializeMilestones(slice.milestones),
        red_flags: serializeSections(slice.red_flags),
        nutrition: serializeSections(slice.nutrition),
        visit_reminders: serializeSections(slice.visit_reminders),
      };
    })
    .filter(Boolean) as Omit<
    ChildGrowthPeriodTranslation,
    "id" | "created_at" | "updated_at"
  >[];
}

const PERIOD_SELECT =
  "*, child_growth_period_translations(id, period_id, language_code, title, subtitle, growth, vaccines, milestones, red_flags, nutrition, visit_reminders, created_at, updated_at)";

const initialState: ChildGrowthState = {
  periods: [],
  selected: null,
  loading: false,
  saving: false,
  error: null,
  success: null,
};

export const fetchChildGrowthPeriods = createAsyncThunk(
  "childGrowth/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("child_growth_periods")
      .select(PERIOD_SELECT)
      .order("age_months", { ascending: true });

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as ChildGrowthPeriod[];
  },
);

export const fetchChildGrowthPeriod = createAsyncThunk(
  "childGrowth/fetchOne",
  async (ageMonths: number, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("child_growth_periods")
      .select(PERIOD_SELECT)
      .eq("age_months", ageMonths)
      .maybeSingle();

    if (error) return rejectWithValue(error.message);
    if (!data) return rejectWithValue("Child growth period not found.");
    return data as ChildGrowthPeriod;
  },
);

export const saveChildGrowthPeriod = createAsyncThunk(
  "childGrowth/save",
  async (form: ChildGrowthPeriodFormState, { rejectWithValue }) => {
    if (!form.translations.en.title.trim()) {
      return rejectWithValue("English title is required.");
    }
    if (!form.age_label.trim()) {
      return rejectWithValue("Age label is required.");
    }
    if (form.age_months < 0 || form.age_months > 216) {
      return rejectWithValue("Age must be between 0 and 216 months (18 years).");
    }

    const periodPayload = {
      age_months: form.age_months,
      age_label: form.age_label.trim(),
      age_group: form.age_group || ageGroupForMonths(form.age_months),
      image_note: form.image_note.trim() || null,
      is_published: form.is_published,
    };

    const existing = await supabase
      .from("child_growth_periods")
      .select("id")
      .eq("age_months", form.age_months)
      .maybeSingle();

    let periodId = existing.data?.id as string | undefined;

    if (periodId) {
      const { error } = await supabase
        .from("child_growth_periods")
        .update(periodPayload)
        .eq("id", periodId);
      if (error) return rejectWithValue(error.message);
    } else {
      const { data, error } = await supabase
        .from("child_growth_periods")
        .insert(periodPayload)
        .select("id")
        .single();
      if (error) return rejectWithValue(error.message);
      periodId = data.id;
    }

    await supabase
      .from("child_growth_period_translations")
      .delete()
      .eq("period_id", periodId);

    const rows = formToTranslationRows(periodId!, form);
    if (rows.length > 0) {
      const { error } = await supabase
        .from("child_growth_period_translations")
        .insert(rows);
      if (error) return rejectWithValue(error.message);
    }

    const { data, error } = await supabase
      .from("child_growth_periods")
      .select(PERIOD_SELECT)
      .eq("id", periodId)
      .single();

    if (error) return rejectWithValue(error.message);
    return data as ChildGrowthPeriod;
  },
);

export const deleteChildGrowthPeriod = createAsyncThunk(
  "childGrowth/delete",
  async (id: string, { rejectWithValue }) => {
    const { error } = await supabase
      .from("child_growth_periods")
      .delete()
      .eq("id", id);
    if (error) return rejectWithValue(error.message);
    return id;
  },
);

const childGrowthSlice = createSlice({
  name: "childGrowth",
  initialState,
  reducers: {
    clearChildGrowthMessages(state) {
      state.error = null;
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChildGrowthPeriods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChildGrowthPeriods.fulfilled, (state, action) => {
        state.loading = false;
        state.periods = action.payload;
      })
      .addCase(fetchChildGrowthPeriods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchChildGrowthPeriod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChildGrowthPeriod.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchChildGrowthPeriod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(saveChildGrowthPeriod.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = null;
      })
      .addCase(saveChildGrowthPeriod.fulfilled, (state, action) => {
        state.saving = false;
        state.success = "Child growth period saved.";
        state.selected = action.payload;
        const index = state.periods.findIndex((p) => p.id === action.payload.id);
        if (index >= 0) state.periods[index] = action.payload;
        else state.periods.push(action.payload);
        state.periods.sort((a, b) => a.age_months - b.age_months);
      })
      .addCase(saveChildGrowthPeriod.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteChildGrowthPeriod.fulfilled, (state, action) => {
        state.periods = state.periods.filter((p) => p.id !== action.payload);
        state.success = "Child growth period deleted.";
      });
  },
});

export const childGrowthReducer = childGrowthSlice.reducer;
export const childGrowthActions = childGrowthSlice.actions;
