export type DoctorCategoryCareFocus =
  | "pregnancy"
  | "child_development"
  | "both";

export const DOCTOR_CATEGORY_CARE_FOCUS_OPTIONS: {
  value: DoctorCategoryCareFocus;
  label: string;
}[] = [
  { value: "pregnancy", label: "Pregnancy" },
  { value: "child_development", label: "Child development" },
  { value: "both", label: "Both" },
];

export function parseDoctorCategoryCareFocus(
  value: unknown,
): DoctorCategoryCareFocus {
  if (
    value === "pregnancy" ||
    value === "child_development" ||
    value === "both"
  ) {
    return value;
  }
  return "both";
}

export function doctorCategoryCareFocusLabel(
  value: DoctorCategoryCareFocus | string | null | undefined,
): string {
  const focus = parseDoctorCategoryCareFocus(value);
  return (
    DOCTOR_CATEGORY_CARE_FOCUS_OPTIONS.find((option) => option.value === focus)
      ?.label ?? "Both"
  );
}
