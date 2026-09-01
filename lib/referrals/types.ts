export type DoctorReferralStats = {
  referralCode: string | null;
  referredCount: number;
  totalCommission: number;
  currency: string;
};

export type ReferralListRow = {
  id: string;
  patientId: string;
  doctorId: string;
  referralCode: string;
  createdAt: string;
  patientName: string | null;
  patientPhone: string | null;
  doctorName: string | null;
  isSubscribed: boolean;
};

export type ReferralCommissionRow = {
  id: string;
  referralId: string;
  doctorId: string;
  patientId: string;
  paymentId: string | null;
  subscriptionAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  currency: string;
  createdAt: string;
  patientName: string | null;
  doctorName: string | null;
};

export type UserReferralInfo = {
  referralCodeUsed: string | null;
  referredByDoctorId: string | null;
  referredByDoctorName: string | null;
  referredAt: string | null;
  canApplyCode: boolean;
};
