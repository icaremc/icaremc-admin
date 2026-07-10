"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_VACCINE, type VaccineFields } from "@/lib/content/formTypes";

type VaccineFieldsEditorProps = {
  label?: string;
  vaccines: VaccineFields[];
  onChange: (vaccines: VaccineFields[]) => void;
};

export default function VaccineFieldsEditor({
  label = "Vaccines",
  vaccines,
  onChange,
}: VaccineFieldsEditorProps) {
  const updateVaccine = (index: number, patch: Partial<VaccineFields>) => {
    onChange(
      vaccines.map((vaccine, i) =>
        i === index ? { ...vaccine, ...patch } : vaccine,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>{label}</Label>
          <p className="mt-0.5 text-xs text-gray-500">
            What the child should receive at this visit.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...vaccines, { ...EMPTY_VACCINE }])}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add vaccine
        </Button>
      </div>

      {vaccines.map((vaccine, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800">
              Vaccine {index + 1}
            </p>
            {vaccines.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  onChange(vaccines.filter((_, i) => i !== index))
                }
                className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Remove vaccine"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div>
            <Label>Vaccine name</Label>
            <Input
              value={vaccine.name}
              onChange={(e) => updateVaccine(index, { name: e.target.value })}
              placeholder="e.g. OPV, Pentavalent, Measles"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>How it&apos;s given</Label>
            <Input
              value={vaccine.route}
              onChange={(e) => updateVaccine(index, { route: e.target.value })}
              placeholder="e.g. Oral drops, injection in the thigh"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Why it matters</Label>
            <Textarea
              value={vaccine.benefitsText}
              onChange={(e) =>
                updateVaccine(index, { benefitsText: e.target.value })
              }
              placeholder="One benefit per line"
              rows={3}
              className="mt-1.5"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
