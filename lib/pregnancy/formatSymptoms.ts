const SYMPTOM_LABELS: Record<string, string> = {
  heavy_bleeding: "Heavy bleeding",
  severe_cramps: "Severe cramps",
  persistent_vomiting: "Persistent vomiting",
  high_fever: "High fever",
};

function humanizeSymptomKey(key: string): string {
  return key
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatSymptomLabel(value: string): string {
  const key = value.trim();
  if (!key) return value;
  return SYMPTOM_LABELS[key] ?? humanizeSymptomKey(key);
}

export function formatSymptomsList(symptoms: string[] | null | undefined): string {
  if (!symptoms?.length) return "";
  return symptoms.map(formatSymptomLabel).join(", ");
}
