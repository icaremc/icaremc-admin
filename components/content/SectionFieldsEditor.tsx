"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_PREGNANCY_SECTION } from "@/lib/content/formTypes";
import type { PregnancySectionFields } from "@/lib/content/formTypes";

type SectionFieldsEditorProps = {
  label: string;
  sections: PregnancySectionFields[];
  onChange: (sections: PregnancySectionFields[]) => void;
  urgentLabel?: string;
};

export default function SectionFieldsEditor({
  label,
  sections,
  onChange,
  urgentLabel = "Mark as urgent",
}: SectionFieldsEditorProps) {
  const updateSection = (
    index: number,
    patch: Partial<PregnancySectionFields>,
  ) => {
    onChange(
      sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    );
  };

  return (
    <div className="space-y-4 border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...sections, { ...EMPTY_PREGNANCY_SECTION }])
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {sections.map((section, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {label} {index + 1}
            </p>
            {sections.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  onChange(sections.filter((_, i) => i !== index))
                }
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={section.title}
              onChange={(e) => updateSection(index, { title: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea
              value={section.body}
              onChange={(e) => updateSection(index, { body: e.target.value })}
              rows={2}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Bullet points (one per line)</Label>
            <Textarea
              value={section.bulletsText}
              onChange={(e) =>
                updateSection(index, { bulletsText: e.target.value })
              }
              rows={3}
              placeholder="One bullet per line"
              className="mt-1.5"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={section.is_urgent}
              onChange={(e) =>
                updateSection(index, { is_urgent: e.target.checked })
              }
            />
            {urgentLabel}
          </label>
        </div>
      ))}
    </div>
  );
}
