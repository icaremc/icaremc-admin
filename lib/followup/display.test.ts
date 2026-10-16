import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachGrowthPeriods,
  groupFollowupTemplatesByMilestone,
} from "./display.ts";
import type { ChildFollowupVisitTemplate } from "@/lib/types/database";

function template(
  patch: Partial<ChildFollowupVisitTemplate> & Pick<ChildFollowupVisitTemplate, "id">,
): ChildFollowupVisitTemplate {
  return {
    code: patch.id,
    sort_order: 1,
    label: "visit",
    offset_days: 0,
    offset_months: null,
    growth_period_id: null,
    modules: { vaccines: true },
    vaccines: [],
    remind_days_before: [0],
    is_published: true,
    created_at: "",
    updated_at: "",
    ...patch,
  };
}

describe("attachGrowthPeriods", () => {
  it("fills age_label from periods when nest is missing", () => {
    const out = attachGrowthPeriods(
      [template({ id: "v1", growth_period_id: "p1" })],
      [{ id: "p1", age_months: 0, age_label: "Newborn / 0–1.5 months" }],
    );
    assert.equal(out[0]?.child_growth_periods?.age_label, "Newborn / 0–1.5 months");
    assert.equal(
      groupFollowupTemplatesByMilestone(out)[0]?.label,
      "Newborn",
    );
  });
});
