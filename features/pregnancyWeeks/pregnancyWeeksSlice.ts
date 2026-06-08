import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabaseClient";
import {
  EMPTY_PREGNANCY_SECTION,
  type PregnancySectionFields,
} from "@/lib/content/formTypes";
import type {
  Locale,
  PregnancyWeek,
  PregnancyWeekSection,
  PregnancyWeekTranslation,
} from "@/lib/types/database";

export type PregnancyWeekFormTranslation = {
  title: string;
  subtitle: string;
  baby_development: string;
  mother_changes: string;
  recommendations: string;
  warning_signs: string;
  sections: PregnancySectionFields[];
};

export type PregnancyWeekFormState = {
  week_number: number;
  trimester: number;
  image_note: string;
  is_published: boolean;
  translations: Record<Locale, PregnancyWeekFormTranslation>;
};

type PregnancyWeeksState = {
  weeks: PregnancyWeek[];
  selected: PregnancyWeek | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
};

const emptyTranslation = (): PregnancyWeekFormTranslation => ({
  title: "",
  subtitle: "",
  baby_development: "",
  mother_changes: "",
  recommendations: "",
  warning_signs: "",
  sections: [{ ...EMPTY_PREGNANCY_SECTION }],
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

function serializeSections(
  sections: PregnancySectionFields[],
): PregnancyWeekSection[] {
  return sections
    .filter((section) => section.title.trim() || section.body.trim())
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

function translationHasContent(slice: PregnancyWeekFormTranslation): boolean {
  const scalarFields = [
    slice.title,
    slice.subtitle,
    slice.baby_development,
    slice.mother_changes,
    slice.recommendations,
    slice.warning_signs,
  ];
  if (scalarFields.some((value) => value.trim())) return true;
  return slice.sections.some(
    (section) =>
      section.title.trim() ||
      section.body.trim() ||
      section.bulletsText.trim(),
  );
}

export function trimesterForWeek(week: number): number {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

export function weekToForm(week: PregnancyWeek): PregnancyWeekFormState {
  const translations = (["en", "am", "om"] as Locale[]).reduce(
    (acc, locale) => {
      const row = week.pregnancy_week_translations?.find(
        (item) => item.language_code === locale,
      );
      acc[locale] = {
        title: row?.title ?? "",
        subtitle: row?.subtitle ?? "",
        baby_development: row?.baby_development ?? "",
        mother_changes: row?.mother_changes ?? "",
        recommendations: row?.recommendations ?? "",
        warning_signs: row?.warning_signs ?? "",
        sections: parseSections(row?.sections),
      };
      return acc;
    },
    {} as Record<Locale, PregnancyWeekFormTranslation>,
  );

  return {
    week_number: week.week_number,
    trimester: week.trimester,
    image_note: week.image_note ?? "",
    is_published: week.is_published,
    translations,
  };
}

export function formToTranslationRows(
  weekId: string,
  form: PregnancyWeekFormState,
): Omit<PregnancyWeekTranslation, "id" | "created_at" | "updated_at">[] {
  return (["en", "am", "om"] as Locale[])
    .map((locale) => {
      const slice = form.translations[locale];
      if (!translationHasContent(slice)) return null;

      return {
        pregnancy_week_id: weekId,
        language_code: locale,
        title: slice.title.trim() || `Week ${form.week_number}`,
        subtitle: slice.subtitle.trim() || null,
        baby_development: slice.baby_development.trim() || null,
        mother_changes: slice.mother_changes.trim() || null,
        recommendations: slice.recommendations.trim() || null,
        warning_signs: slice.warning_signs.trim() || null,
        sections: serializeSections(slice.sections),
      };
    })
    .filter(Boolean) as Omit<
    PregnancyWeekTranslation,
    "id" | "created_at" | "updated_at"
  >[];
}

const initialState: PregnancyWeeksState = {
  weeks: [],
  selected: null,
  loading: false,
  saving: false,
  error: null,
  success: null,
};

export const fetchPregnancyWeeks = createAsyncThunk(
  "pregnancyWeeks/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("pregnancy_weeks")
      .select(
        "*, pregnancy_week_translations(id, pregnancy_week_id, language_code, title, subtitle, baby_development, mother_changes, recommendations, warning_signs, sections, created_at, updated_at)",
      )
      .order("week_number", { ascending: true });

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as PregnancyWeek[];
  },
);

export const fetchPregnancyWeek = createAsyncThunk(
  "pregnancyWeeks/fetchOne",
  async (weekNumber: number, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("pregnancy_weeks")
      .select(
        "*, pregnancy_week_translations(id, pregnancy_week_id, language_code, title, subtitle, baby_development, mother_changes, recommendations, warning_signs, sections, created_at, updated_at)",
      )
      .eq("week_number", weekNumber)
      .maybeSingle();

    if (error) return rejectWithValue(error.message);
    if (!data) return rejectWithValue("Pregnancy week not found.");
    return data as PregnancyWeek;
  },
);

export const savePregnancyWeek = createAsyncThunk(
  "pregnancyWeeks/save",
  async (form: PregnancyWeekFormState, { rejectWithValue }) => {
    if (!form.translations.en.title.trim()) {
      return rejectWithValue("English title is required.");
    }

    const weekPayload = {
      week_number: form.week_number,
      trimester: trimesterForWeek(form.week_number),
      image_note: form.image_note.trim() || null,
      is_published: form.is_published,
    };

    const existing = await supabase
      .from("pregnancy_weeks")
      .select("id")
      .eq("week_number", form.week_number)
      .maybeSingle();

    let weekId = existing.data?.id as string | undefined;

    if (weekId) {
      const { error } = await supabase
        .from("pregnancy_weeks")
        .update(weekPayload)
        .eq("id", weekId);
      if (error) return rejectWithValue(error.message);
    } else {
      const { data, error } = await supabase
        .from("pregnancy_weeks")
        .insert(weekPayload)
        .select("id")
        .single();
      if (error) return rejectWithValue(error.message);
      weekId = data.id;
    }

    await supabase
      .from("pregnancy_week_translations")
      .delete()
      .eq("pregnancy_week_id", weekId);

    const rows = formToTranslationRows(weekId!, form);
    if (rows.length > 0) {
      const { error } = await supabase
        .from("pregnancy_week_translations")
        .insert(rows);
      if (error) return rejectWithValue(error.message);
    }

    const { data, error } = await supabase
      .from("pregnancy_weeks")
      .select(
        "*, pregnancy_week_translations(id, pregnancy_week_id, language_code, title, subtitle, baby_development, mother_changes, recommendations, warning_signs, sections, created_at, updated_at)",
      )
      .eq("id", weekId)
      .single();

    if (error) return rejectWithValue(error.message);
    return data as PregnancyWeek;
  },
);

export const deletePregnancyWeek = createAsyncThunk(
  "pregnancyWeeks/delete",
  async (id: string, { rejectWithValue }) => {
    const { error } = await supabase.from("pregnancy_weeks").delete().eq("id", id);
    if (error) return rejectWithValue(error.message);
    return id;
  },
);

const pregnancyWeeksSlice = createSlice({
  name: "pregnancyWeeks",
  initialState,
  reducers: {
    clearPregnancyWeekMessages(state) {
      state.error = null;
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPregnancyWeeks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPregnancyWeeks.fulfilled, (state, action) => {
        state.loading = false;
        state.weeks = action.payload;
      })
      .addCase(fetchPregnancyWeeks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchPregnancyWeek.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPregnancyWeek.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchPregnancyWeek.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(savePregnancyWeek.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = null;
      })
      .addCase(savePregnancyWeek.fulfilled, (state, action) => {
        state.saving = false;
        state.success = "Pregnancy week saved.";
        state.selected = action.payload;
        const index = state.weeks.findIndex((w) => w.id === action.payload.id);
        if (index >= 0) state.weeks[index] = action.payload;
        else state.weeks.push(action.payload);
        state.weeks.sort((a, b) => a.week_number - b.week_number);
      })
      .addCase(savePregnancyWeek.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(deletePregnancyWeek.fulfilled, (state, action) => {
        state.weeks = state.weeks.filter((week) => week.id !== action.payload);
        state.success = "Pregnancy week deleted.";
      });
  },
});

export const pregnancyWeeksReducer = pregnancyWeeksSlice.reducer;
export const pregnancyWeeksActions = pregnancyWeeksSlice.actions;
