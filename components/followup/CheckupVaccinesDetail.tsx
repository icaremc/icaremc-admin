import type { ChildGrowthVaccine } from "@/lib/types/database";

export default function CheckupVaccinesDetail({
  vaccines,
}: {
  vaccines: ChildGrowthVaccine[];
}) {
  const items = vaccines.filter((v) => v.name?.trim());

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">No vaccines added for this check-up yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((vaccine, index) => (
        <li
          key={`${vaccine.name}-${index}`}
          className="rounded-xl border border-gray-200 bg-gray-50/80 p-4"
        >
          <p className="font-medium text-gray-900">{vaccine.name}</p>
          {vaccine.route?.trim() ? (
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium text-gray-700">How it&apos;s given:</span>{" "}
              {vaccine.route.trim()}
            </p>
          ) : null}
          {vaccine.benefits && vaccine.benefits.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Why it matters
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {vaccine.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex}>{benefit}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
