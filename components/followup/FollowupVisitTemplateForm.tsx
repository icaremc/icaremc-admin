"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VaccineFieldsEditor from "@/components/content/VaccineFieldsEditor";
import type { ChildGrowthPeriod } from "@/lib/types/database";
import type { FollowupVisitTemplateFormState } from "@/features/followupVisits/followupVisitsSlice";
import { milestoneDisplayLabel } from "@/lib/followup/display";

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
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <Label htmlFor="followup-label">Visit name</Label>
            <Input
              id="followup-label"
              value={value.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="e.g. 6 weeks, 9 months"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-gray-500">
              Shown on the parent&apos;s calendar and reminders.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="followup-offset">Due after birth</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="followup-offset"
                  type="number"
                  min={0}
                  value={value.offset_value}
                  onChange={(e) =>
                    update({
                      offset_value: Number.parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-24"
                />
                <select
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  value={value.offset_type}
                  onChange={(e) =>
                    update({
                      offset_type:
                        e.target.value === "months" ? "months" : "days",
                    })
                  }
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="followup-period">Show milestone content</Label>
              <select
                id="followup-period"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={value.growth_period_id}
                onChange={(e) => update({ growth_period_id: e.target.value })}
              >
                <option value="">None (reminder only)</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {milestoneDisplayLabel(period.age_label, period.age_months)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Parents see this age&apos;s checklist and growth tips when this
                visit is due.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="followup-remind">Reminder days before</Label>
            <Input
              id="followup-remind"
              value={value.remind_days_before}
              onChange={(e) => update({ remind_days_before: e.target.value })}
              placeholder="7, 1, 0"
              className="mt-1.5 max-w-xs"
            />
            <p className="mt-1 text-xs text-gray-500">
              When to notify parents before the visit.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <p className="text-sm text-gray-600">
          List every vaccine given at this visit. Parents mark each dose once;
          it won&apos;t repeat at later visits.
        </p>
        <div className="mt-4">
          <VaccineFieldsEditor
            label="Vaccines at this visit"
            vaccines={value.vaccines}
            onChange={(vaccines) => update({ vaccines })}
          />
        </div>
      </div>

      {isNew ? (
        <details className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">
            Advanced
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="followup-code">Code</Label>
              <Input
                id="followup-code"
                value={value.code}
                onChange={(e) => update({ code: e.target.value })}
                placeholder="visit_6w"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-gray-500">
                Internal id for the app. Cannot change later.
              </p>
            </div>
            <div>
              <Label htmlFor="followup-sort">Sort order</Label>
              <Input
                id="followup-sort"
                type="number"
                value={value.sort_order}
                onChange={(e) =>
                  update({
                    sort_order: Number.parseInt(e.target.value, 10) || 0,
                  })
                }
                className="mt-1.5"
              />
            </div>
          </div>
        </details>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.is_published}
          onChange={(e) => update({ is_published: e.target.checked })}
        />
        Published (shown on the parent&apos;s schedule)
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
