"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChildGrowthPeriod } from "@/lib/types/database";
import type { FollowupVisitTemplateFormState } from "@/features/followupVisits/followupVisitsSlice";
import { milestoneDisplayLabel } from "@/lib/followup/display";

const MODULE_FIELDS: {
  key: keyof FollowupVisitTemplateFormState["modules"];
  label: string;
}[] = [
  { key: "growth", label: "Growth" },
  { key: "nutrition", label: "Nutrition" },
  { key: "vaccines", label: "Vaccines" },
  { key: "development", label: "Development" },
  { key: "counseling", label: "Counseling" },
  { key: "red_flags", label: "Red flags" },
];

type FollowupVisitTemplateFormProps = {
  value: FollowupVisitTemplateFormState;
  onChange: (value: FollowupVisitTemplateFormState) => void;
  periods: ChildGrowthPeriod[];
  isNew?: boolean;
  onSave?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  saveLabel?: string;
};

export default function FollowupVisitTemplateForm({
  value,
  onChange,
  periods,
  isNew = false,
  onSave,
  onDelete,
  saving = false,
  saveLabel = "Save",
}: FollowupVisitTemplateFormProps) {
  const update = (patch: Partial<FollowupVisitTemplateFormState>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="followup-code">Code</Label>
          <Input
            id="followup-code"
            value={value.code}
            disabled={!isNew}
            onChange={(e) => update({ code: e.target.value })}
            placeholder="visit_6w"
          />
          <p className="mt-1 text-xs text-gray-500">
            Stable id used by the app (e.g. visit_7d). Cannot change after create.
          </p>
        </div>
        <div>
          <Label htmlFor="followup-sort">Sort order</Label>
          <Input
            id="followup-sort"
            type="number"
            value={value.sort_order}
            onChange={(e) =>
              update({ sort_order: Number.parseInt(e.target.value, 10) || 0 })
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="followup-label">Label</Label>
        <Input
          id="followup-label"
          value={value.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="6 weeks"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Offset type</Label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={value.offset_type}
            onChange={(e) =>
              update({
                offset_type: e.target.value === "months" ? "months" : "days",
              })
            }
          >
            <option value="days">Days from birth</option>
            <option value="months">Months from birth</option>
          </select>
        </div>
        <div>
          <Label htmlFor="followup-offset">Offset value</Label>
          <Input
            id="followup-offset"
            type="number"
            min={0}
            value={value.offset_value}
            onChange={(e) =>
              update({ offset_value: Number.parseInt(e.target.value, 10) || 0 })
            }
          />
        </div>
        <div>
          <Label htmlFor="followup-period">Linked milestone</Label>
          <select
            id="followup-period"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={value.growth_period_id}
            onChange={(e) => update({ growth_period_id: e.target.value })}
          >
            <option value="">None (content later)</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {milestoneDisplayLabel(period.age_label, period.age_months)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Several visits (e.g. birth, 7 days, 6 weeks) can share one milestone.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="followup-remind">Remind days before (comma-separated)</Label>
        <Input
          id="followup-remind"
          value={value.remind_days_before}
          onChange={(e) => update({ remind_days_before: e.target.value })}
          placeholder="7, 1, 0"
        />
        <p className="mt-1 text-xs text-gray-500">
          Used in Phase 3 for push reminders (e.g. 7 days before, day-of).
        </p>
      </div>

      <div>
        <Label className="mb-2 block">Visit modules</Label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={value.modules[field.key]}
                onChange={(e) =>
                  update({
                    modules: {
                      ...value.modules,
                      [field.key]: e.target.checked,
                    },
                  })
                }
              />
              {field.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.is_published}
          onChange={(e) => update({ is_published: e.target.checked })}
        />
        Published (used when generating child visit schedules)
      </label>

      <div className="flex flex-wrap gap-3">
        {onSave ? (
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : saveLabel}
          </Button>
        ) : null}
        {onDelete ? (
          <Button variant="destructive" onClick={onDelete} disabled={saving}>
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
