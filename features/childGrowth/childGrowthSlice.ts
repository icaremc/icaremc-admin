import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/store";
import { rejectUnlessCanManage } from "@/lib/rejectUnlessCanManage";
import {
  EMPTY_GROWTH,
  EMPTY_GROWTH_METRIC,
  EMPTY_LEARNING_PATH_ITEM,
  EMPTY_MILESTONE_CATEGORY,
  EMPTY_PREGNANCY_SECTION,
  EMPTY_VACCINE,
  type GrowthFields,
  type GrowthMetricSexFields,
  type LearningPathItemFields,
  type MilestoneCategoryFields,
  type PregnancySectionFields,
  type VaccineFields,
} from "@/lib/content/formTypes";
import {
  collectLearningPathImageUrls,
  learningPathItemHasContent,
  serializeLearningPathItemMedia,
} from "@/lib/content/learningPathMedia";
import { syncLocaleTranslationRows } from "@/lib/content/syncLocaleRows";
import {
  ageGroupForMonths,
  type ChildAgeGroup,
} from "@/lib/childGrowth/periods";
import { supabase } from "@/lib/supabaseClient";
import { logContentDeleted, logContentSaved } from "@/lib/client/adminActivityEvents";
import type {
  ChildGrowthGrowthData,
  ChildGrowthMetrics,
  ChildGrowthMetricSex,
  ChildGrowthMilestoneCategory,
  ChildGrowthPeriod,
  ChildGrowthPeriodTranslation,
  ChildGrowthVaccine,
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
  vaccines: VaccineFields[];
  milestones: MilestoneCategoryFields[];
  red_flags: PregnancySectionFields[];
  nutrition: PregnancySectionFields[];
  visit_reminders: PregnancySectionFields[];
};

export type ChildGrowthMetricsForm = {
  boys: GrowthMetricSexFields;
  girls: GrowthMetricSexFields;
};

export type ChildGrowthPeriodFormState = {
  age_months: number;
  age_label: string;
  age_group: ChildAgeGroup;
  image_note: string;
  is_published: boolean;
  growth_metrics: ChildGrowthMetricsForm;
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
  vaccines: [{ ...EMPTY_VACCINE }],
  milestones: [{ ...EMPTY_MILESTONE_CATEGORY }],
  red_flags: [{ ...EMPTY_PREGNANCY_SECTION }],
  nutrition: [{ ...EMPTY_PREGNANCY_SECTION }],
  visit_reminders: [{ ...EMPTY_PREGNANCY_SECTION }],
});

function parseVaccines(raw: unknown): VaccineFields[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ ...EMPTY_VACCINE }];
  }
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const map = item as Record<string, unknown>;
      const benefits = map.benefits ?? map.bullets;
      const benefitsText = Array.isArray(benefits)
        ? benefits.map((b) => String(b)).join("\n")
        : "";

      // New shape: { name, route, benefits[] }
      if (typeof map.name === "string" || typeof map.route === "string") {
        return {
          name: typeof map.name === "string" ? map.name : "",
          route: typeof map.route === "string" ? map.route : "",
          benefitsText,
        };
      }

      // Legacy shape: { title, body, bullets[] }
      return {
        name: typeof map.title === "string" ? map.title : "",
        route: typeof map.body === "string" ? map.body : "",
        benefitsText,
      };
    });
}

function serializeVaccines(vaccines: VaccineFields[]): ChildGrowthVaccine[] {
  return vaccines
    .filter(
      (vaccine) =>
        vaccine.name.trim() || vaccine.route.trim() || vaccine.benefitsText.trim(),
    )
    .map((vaccine) => ({
      name: vaccine.name.trim(),
      route: vaccine.route.trim(),
      benefits: vaccine.benefitsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
}

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

const METRIC_KEYS: (keyof GrowthMetricSexFields)[] = [
  "weight_kg",
  "weight_min",
  "weight_max",
  "height_cm",
  "height_min",
  "height_max",
  "hc_cm",
  "hc_min",
  "hc_max",
];

function parseMetricSex(raw: unknown): GrowthMetricSexFields {
  if (!raw || typeof raw !== "object") return { ...EMPTY_GROWTH_METRIC };
  const map = raw as Record<string, unknown>;
  const result = { ...EMPTY_GROWTH_METRIC };
  for (const key of METRIC_KEYS) {
    const value = map[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = String(value);
    } else if (typeof value === "string" && value.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
}

function parseMetrics(raw: unknown): ChildGrowthMetricsForm {
  if (!raw || typeof raw !== "object") {
    return { boys: { ...EMPTY_GROWTH_METRIC }, girls: { ...EMPTY_GROWTH_METRIC } };
  }
  const map = raw as Record<string, unknown>;
  return {
    boys: parseMetricSex(map.boys),
    girls: parseMetricSex(map.girls),
  };
}

function serializeMetricSex(fields: GrowthMetricSexFields): ChildGrowthMetricSex | undefined {
  const result: ChildGrowthMetricSex = {};
  let hasValue = false;
  for (const key of METRIC_KEYS) {
    const raw = fields[key].trim();
    if (!raw) continue;
    const num = Number(raw);
    if (Number.isFinite(num)) {
      result[key] = num;
      hasValue = true;
    }
  }
  return hasValue ? result : undefined;
}

function serializeMetrics(metrics: ChildGrowthMetricsForm): ChildGrowthMetrics {
  const boys = serializeMetricSex(metrics.boys);
  const girls = serializeMetricSex(metrics.girls);
  const result: ChildGrowthMetrics = {};
  if (boys) result.boys = boys;
  if (girls) result.girls = girls;
  return result;
}

function parseLearningPathItem(raw: unknown): LearningPathItemFields {
  if (typeof raw === "string") {
    return { ...EMPTY_LEARNING_PATH_ITEM, label: raw.trim() };
  }
  if (raw && typeof raw === "object") {
    const map = raw as Record<string, unknown>;
    const imageUrls = collectLearningPathImageUrls({
      image_url:
        typeof map.image_url === "string"
          ? map.image_url
          : typeof map.imageUrl === "string"
            ? map.imageUrl
            : "",
      image_urls: Array.isArray(map.image_urls)
        ? map.image_urls.filter((u): u is string => typeof u === "string")
        : Array.isArray(map.imageUrls)
          ? map.imageUrls.filter((u): u is string => typeof u === "string")
          : [],
    });
    return {
      label:
        (typeof map.label === "string" ? map.label : "") ||
        (typeof map.text === "string" ? map.text : "") ||
        (typeof map.title === "string" ? map.title : ""),
      explanation:
        (typeof map.explanation === "string" ? map.explanation : "") ||
        (typeof map.description === "string" ? map.description : ""),
      image_url: imageUrls[0] ?? "",
      image_urls: imageUrls,
      video_url:
        typeof map.video_url === "string"
          ? map.video_url
          : typeof map.videoUrl === "string"
            ? map.videoUrl
            : "",
    };
  }
  return { ...EMPTY_LEARNING_PATH_ITEM };
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
      const parsedItems = Array.isArray(items)
        ? items.map(parseLearningPathItem).filter((entry) => entry.label.trim())
        : [];
      return {
        title: typeof map.title === "string" ? map.title : "",
        items:
          parsedItems.length > 0
            ? parsedItems
            : [{ ...EMPTY_LEARNING_PATH_ITEM }],
      };
    });
}

function serializeMilestones(
  categories: MilestoneCategoryFields[],
): ChildGrowthMilestoneCategory[] {
  return categories
    .filter((category) =>
      category.title.trim() ||
      category.items.some((item) => learningPathItemHasContent(item)),
    )
    .map((category) => ({
      title: category.title.trim(),
      items: category.items
        .filter((item) => learningPathItemHasContent(item))
        .map((item) => {
          const explanation = item.explanation.trim();
          return {
            label: item.label.trim(),
            ...(explanation ? { explanation } : {}),
            ...serializeLearningPathItemMedia(item),
          };
        }),
    }));
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
  // Boys/girls text ranges are deprecated — numeric growth_metrics is the source of truth.
  const notes = growth.notes.trim() || undefined;
  if (!notes) return {};
  return { notes };
}

function translationHasContent(
  slice: ChildGrowthPeriodFormTranslation,
): boolean {
  if (slice.title.trim() || slice.subtitle.trim()) return true;
  if (slice.growth.notes.trim()) return true;
  if (
    slice.milestones.some(
      (category) =>
        category.title.trim() ||
        category.items.some((item) => learningPathItemHasContent(item)),
    )
  ) {
    return true;
  }
  return [...slice.red_flags, ...slice.nutrition].some(
    (section) =>
      section.title.trim() ||
      section.body.trim() ||
      section.bulletsText.trim(),
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
        vaccines: parseVaccines(row?.vaccines),
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
    growth_metrics: parseMetrics(period.growth_metrics),
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
    vaccines: [{ ...EMPTY_VACCINE }],
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
    growth_metrics: {
      boys: { ...EMPTY_GROWTH_METRIC },
      girls: { ...EMPTY_GROWTH_METRIC },
    },
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
        // Vaccines + visit reminders live in Follow-up / vaccine schedule — clear on save.
        vaccines: [],
        milestones: serializeMilestones(slice.milestones),
        red_flags: serializeSections(slice.red_flags),
        nutrition: serializeSections(slice.nutrition),
        visit_reminders: [],
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
  async (form: ChildGrowthPeriodFormState, { rejectWithValue, getState }) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

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
      growth_metrics: serializeMetrics(form.growth_metrics),
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

    const rows = formToTranslationRows(periodId!, form);
    const syncError = await syncLocaleTranslationRows({
      table: "child_growth_period_translations",
      parentColumn: "period_id",
      parentId: periodId!,
      onConflict: "period_id,language_code",
      rows,
    });
    if (syncError) return rejectWithValue(syncError);

    const { data, error } = await supabase
      .from("child_growth_periods")
      .select(PERIOD_SELECT)
      .eq("id", periodId)
      .single();

    if (error) return rejectWithValue(error.message);
    logContentSaved(
      "child_growth_period",
      periodId!,
      `Saved child milestone: ${form.age_months} months`,
      { age_months: form.age_months },
    );
    return data as ChildGrowthPeriod;
  },
);

export const deleteChildGrowthPeriod = createAsyncThunk(
  "childGrowth/delete",
  async (id: string, { rejectWithValue, getState }) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

    const { error } = await supabase
      .from("child_growth_periods")
      .delete()
      .eq("id", id);
    if (error) return rejectWithValue(error.message);
    logContentDeleted("child_growth_period", id, "Deleted child milestone period", {
      resource_id: id,
    });
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
