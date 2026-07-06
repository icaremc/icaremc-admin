export type DoctorRecentEarning = {
  id: string;
  amount: number;
  created_at: string;
  note: string | null;
  appointment_id: string | null;
  appointment_date: string | null;
  time_slot: string | null;
  service_name: string | null;
  patient_id: string | null;
  patient_name: string | null;
};

export type WalletEarningRow = {
  id: string;
  amount: number | string;
  created_at: string;
  note: string | null;
  appointment_id: string | null;
  appointments?:
    | {
        id: string;
        patient_id: string;
        patient_name: string | null;
        appointment_date: string;
        time_slot: string;
        service_name: string | null;
        profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
      }
    | {
        id: string;
        patient_id: string;
        patient_name: string | null;
        appointment_date: string;
        time_slot: string;
        service_name: string | null;
        profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
      }[]
    | null;
};

function resolveAppointment(value: WalletEarningRow["appointments"]) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapWalletEarningRow(row: WalletEarningRow): DoctorRecentEarning {
  const appt = resolveAppointment(row.appointments);
  const profile = appt?.profiles;
  const profileName = Array.isArray(profile)
    ? profile[0]?.full_name
    : profile?.full_name;
  const patientName =
    appt?.patient_name?.trim() || profileName?.trim() || null;

  return {
    id: row.id,
    amount: Number(row.amount ?? 0),
    created_at: row.created_at,
    note: row.note,
    appointment_id: appt?.id ?? row.appointment_id,
    appointment_date: appt?.appointment_date ?? null,
    time_slot: appt?.time_slot ?? null,
    service_name: appt?.service_name ?? null,
    patient_id: appt?.patient_id ?? null,
    patient_name: patientName,
  };
}
