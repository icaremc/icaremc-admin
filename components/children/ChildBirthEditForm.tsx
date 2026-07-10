"use client";

import { useEffect, useState } from "react";
import type { Child, ChildUpdatePayload } from "@/lib/types/database";
import { CHILD_BLOOD_GROUPS } from "@/lib/children/childUi";

type Props = {
  child: Child;
  saving: boolean;
  onSave: (patch: ChildUpdatePayload) => void;
};

export default function ChildBirthEditForm({ child, saving, onSave }: Props) {
  const [name, setName] = useState(child.name);
  const [gender, setGender] = useState<"male" | "female">(child.gender);
  const [birthDate, setBirthDate] = useState(child.birth_date);
  const [birthWeight, setBirthWeight] = useState(
    child.birth_weight != null ? String(child.birth_weight) : "",
  );
  const [gaWeeks, setGaWeeks] = useState(
    child.gestational_age_weeks != null
      ? String(child.gestational_age_weeks)
      : "",
  );
  const [gaDays, setGaDays] = useState(
    child.gestational_age_days != null ? String(child.gestational_age_days) : "",
  );
  const [birthHospital, setBirthHospital] = useState(child.birth_hospital ?? "");
  const [bloodGroup, setBloodGroup] = useState(child.blood_group ?? "");
  const [woreda, setWoreda] = useState(child.woreda ?? "");

  useEffect(() => {
    setName(child.name);
    setGender(child.gender);
    setBirthDate(child.birth_date);
    setBirthWeight(
      child.birth_weight != null ? String(child.birth_weight) : "",
    );
    setGaWeeks(
      child.gestational_age_weeks != null
        ? String(child.gestational_age_weeks)
        : "",
    );
    setGaDays(
      child.gestational_age_days != null ? String(child.gestational_age_days) : "",
    );
    setBirthHospital(child.birth_hospital ?? "");
    setBloodGroup(child.blood_group ?? "");
    setWoreda(child.woreda ?? "");
  }, [child]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const weight = birthWeight.trim()
      ? Number.parseFloat(birthWeight)
      : null;
    const weeks = gaWeeks.trim() ? Number.parseFloat(gaWeeks) : null;
    const days = gaDays.trim() ? Number.parseInt(gaDays, 10) : null;

    onSave({
      name: name.trim(),
      gender,
      birth_date: birthDate,
      birth_weight: Number.isFinite(weight as number) ? weight : null,
      gestational_age_weeks: Number.isFinite(weeks as number) ? weeks : null,
      gestational_age_days: Number.isFinite(days as number) ? days : null,
      birth_hospital: birthHospital.trim() || null,
      blood_group: bloodGroup || null,
      woreda: woreda.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Sex</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "male" | "female")}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">
            Date of birth
          </span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">
            Birth weight (kg)
          </span>
          <input
            value={birthWeight}
            onChange={(e) => setBirthWeight(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="e.g. 3.2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">
            Gestational age (weeks)
          </span>
          <input
            value={gaWeeks}
            onChange={(e) => setGaWeeks(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="e.g. 38"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">
            Extra days
          </span>
          <input
            value={gaDays}
            onChange={(e) => setGaDays(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="0-6"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-gray-700">
            Birth hospital
          </span>
          <input
            value={birthHospital}
            onChange={(e) => setBirthHospital(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">
            Blood group
          </span>
          <select
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {CHILD_BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">
            Woreda / area
          </span>
          <input
            value={woreda}
            onChange={(e) => setWoreda(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save birth record"}
      </button>
    </form>
  );
}
