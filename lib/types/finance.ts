export type FinanceSettings = {
  minimumAmountWithdraw: number;
  platformCommissionPercent: number;
};

export type PayoutRequestStatus = "pending" | "approved" | "rejected" | "completed";

export type DoctorPayoutMethod = {
  id: string;
  doctor_id: string;
  holder_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string | null;
  swift_code: string | null;
  is_active: boolean;
  is_default: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type DoctorPayoutRequest = {
  id: string;
  doctor_id: string;
  payout_method_id: string | null;
  amount: number;
  note: string | null;
  admin_note: string | null;
  status: PayoutRequestStatus;
  created_at: string;
  payment_date: string | null;
  updated_at: string;
  doctor_profiles?: {
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
  doctor_payout_methods?: DoctorPayoutMethod | null;
};

export type DoctorWallet = {
  doctor_id: string;
  available_balance: number;
  pending_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type WalletTransaction = {
  id: string;
  doctor_id: string;
  amount: number;
  is_credit: boolean;
  type:
    | "appointment_earning"
    | "payout_hold"
    | "payout_release"
    | "payout_paid"
    | "adjustment";
  appointment_id: string | null;
  payout_request_id: string | null;
  note: string | null;
  created_at: string;
  doctor_profiles?: {
    first_name: string;
    last_name: string;
  } | null;
};
