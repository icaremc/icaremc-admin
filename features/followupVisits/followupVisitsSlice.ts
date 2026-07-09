import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/store";
import { rejectUnlessCanManage } from "@/lib/rejectUnlessCanManage";
import { supabase } from "@/lib/supabaseClient";
import type {
  ChildFollowupVisitTemplate,
  FollowupVisitModules,
} from "@/lib/types/database";

export type FollowupVisitTemplateFormState = {
  code: string;
  sort_order: number;
  label: string;
  offset_type: "days" | "months";
  offset_value: number;
  growth_period_id: string;
  modules: Required<FollowupVisitModules>;
  remind_days_before: string;
  is_published: boolean;
};

type FollowupVisitsState = {
  templates: ChildFollowupVisitTemplate[];
  selected: ChildFollowupVisitTemplate | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
};

const TEMPLATE_SELECT =
  "*, child_growth_periods(id, age_months, age_label)";

export const defaultFollowupModules = (): Required<FollowupVisitModules> => ({
  growth: true,
  nutrition: true,
  vaccines: true,
  development: true,
  counseling: true,
  red_flags: true,
});

export const emptyFollowupTemplateForm = (): FollowupVisitTemplateFormState => ({
  code: "",
  sort_order: 100,
  label: "",
  offset_type: "days",
  offset_value: 0,
  growth_period_id: "",
  modules: defaultFollowupModules(),
  remind_days_before: "7, 1, 0",
  is_published: true,
});

function parseRemindDays(raw: string): number[] {
  const values = raw
    .split(/[,;\s]+/)
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return values.length > 0 ? values : [7, 1, 0];
}

function formatRemindDays(values: number[] | null | undefined): string {
  if (!values?.length) return "7, 1, 0";
  return values.join(", ");
}

export function templateToForm(
  template: ChildFollowupVisitTemplate,
): FollowupVisitTemplateFormState {
  const offsetType = template.offset_months != null ? "months" : "days";
  return {
    code: template.code,
    sort_order: template.sort_order,
    label: template.label,
    offset_type: offsetType,
    offset_value:
      offsetType === "months"
        ? (template.offset_months ?? 0)
        : (template.offset_days ?? 0),
    growth_period_id: template.growth_period_id ?? "",
    modules: {
      ...defaultFollowupModules(),
      ...template.modules,
    },
    remind_days_before: formatRemindDays(template.remind_days_before),
    is_published: template.is_published,
  };
}

function formToPayload(form: FollowupVisitTemplateFormState, opts?: { includeCode?: boolean }) {
  const payload: Record<string, unknown> = {
    sort_order: form.sort_order,
    label: form.label.trim(),
    offset_days: form.offset_type === "days" ? form.offset_value : null,
    offset_months: form.offset_type === "months" ? form.offset_value : null,
    growth_period_id: form.growth_period_id.trim() || null,
    modules: form.modules,
    remind_days_before: parseRemindDays(form.remind_days_before),
    is_published: form.is_published,
  };
  if (opts?.includeCode !== false) {
    payload.code = form.code.trim();
  }
  return payload;
}

async function fetchTemplateById(id: string) {
  const { data, error } = await supabase
    .from("child_followup_visit_templates")
    .select(TEMPLATE_SELECT)
    .eq("id", id)
    .maybeSingle();
  return { data: data as ChildFollowupVisitTemplate | null, error };
}

export const fetchFollowupVisitTemplates = createAsyncThunk(
  "followupVisits/fetchAll",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("child_followup_visit_templates")
      .select(TEMPLATE_SELECT)
      .order("sort_order", { ascending: true });

    if (error) return rejectWithValue(error.message);
    return (data ?? []) as ChildFollowupVisitTemplate[];
  },
);

export const fetchFollowupVisitTemplate = createAsyncThunk(
  "followupVisits/fetchOne",
  async (id: string, { rejectWithValue }) => {
    const { data, error } = await fetchTemplateById(id);
    if (error) return rejectWithValue(error.message);
    if (!data) return rejectWithValue("Template not found");
    return data;
  },
);

export const createFollowupVisitTemplate = createAsyncThunk(
  "followupVisits/create",
  async (form: FollowupVisitTemplateFormState, { getState, rejectWithValue }) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

    if (!form.code.trim()) {
      return rejectWithValue("Code is required.");
    }
    if (!form.label.trim()) {
      return rejectWithValue("Label is required.");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("child_followup_visit_templates")
      .insert(formToPayload(form, { includeCode: true }))
      .select("id")
      .maybeSingle();

    if (insertError) return rejectWithValue(insertError.message);
    if (!inserted?.id) {
      return rejectWithValue(
        "Could not create template. Check you are signed in as an active portal admin.",
      );
    }

    const { data, error } = await fetchTemplateById(inserted.id);
    if (error) return rejectWithValue(error.message);
    if (!data) return rejectWithValue("Template created but could not be reloaded.");
    return data;
  },
);

export const updateFollowupVisitTemplate = createAsyncThunk(
  "followupVisits/update",
  async (
    payload: { id: string; form: FollowupVisitTemplateFormState },
    { getState, rejectWithValue },
  ) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

    if (!payload.form.label.trim()) {
      return rejectWithValue("Label is required.");
    }

    // Update without nested embed + .single() (that caused the coerce error
    // when RLS returned 0 rows). Code is immutable after create.
    const { data: updated, error: updateError } = await supabase
      .from("child_followup_visit_templates")
      .update(formToPayload(payload.form, { includeCode: false }))
      .eq("id", payload.id)
      .select("id")
      .maybeSingle();

    if (updateError) return rejectWithValue(updateError.message);
    if (!updated?.id) {
      return rejectWithValue(
        "Update blocked by database permissions. Run child_followup_admin_rls_fix.sql, and ensure your user is in admin_users (active).",
      );
    }

    const { data, error } = await fetchTemplateById(payload.id);
    if (error) return rejectWithValue(error.message);
    if (!data) return rejectWithValue("Saved, but template could not be reloaded.");
    return data;
  },
);

export const deleteFollowupVisitTemplate = createAsyncThunk(
  "followupVisits/delete",
  async (id: string, { getState, rejectWithValue }) => {
    const denied = rejectUnlessCanManage(
      (getState() as RootState).auth.user?.adminRole,
      "manage_content",
    );
    if (denied) return rejectWithValue(denied);

    const { error } = await supabase
      .from("child_followup_visit_templates")
      .delete()
      .eq("id", id);

    if (error) return rejectWithValue(error.message);
    return id;
  },
);

const initialState: FollowupVisitsState = {
  templates: [],
  selected: null,
  loading: false,
  saving: false,
  error: null,
  success: null,
};

const followupVisitsSlice = createSlice({
  name: "followupVisits",
  initialState,
  reducers: {
    clearFollowupVisitMessages(state) {
      state.error = null;
      state.success = null;
    },
    clearFollowupVisitSelected(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowupVisitTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowupVisitTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(fetchFollowupVisitTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchFollowupVisitTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowupVisitTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchFollowupVisitTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createFollowupVisitTemplate.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createFollowupVisitTemplate.fulfilled, (state, action) => {
        state.saving = false;
        state.success = "Visit template created";
        state.templates = [...state.templates, action.payload].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
      })
      .addCase(createFollowupVisitTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(updateFollowupVisitTemplate.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateFollowupVisitTemplate.fulfilled, (state, action) => {
        state.saving = false;
        state.success = "Visit template saved";
        state.selected = action.payload;
        const index = state.templates.findIndex((t) => t.id === action.payload.id);
        if (index >= 0) state.templates[index] = action.payload;
        state.templates.sort((a, b) => a.sort_order - b.sort_order);
      })
      .addCase(updateFollowupVisitTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteFollowupVisitTemplate.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteFollowupVisitTemplate.fulfilled, (state, action) => {
        state.saving = false;
        state.templates = state.templates.filter((t) => t.id !== action.payload);
        if (state.selected?.id === action.payload) state.selected = null;
      })
      .addCase(deleteFollowupVisitTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const followupVisitsActions = followupVisitsSlice.actions;
export const followupVisitsReducer = followupVisitsSlice.reducer;
