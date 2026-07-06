import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { DoctorWalletHistory } from "@/lib/finance/doctorWalletHistory";
import type { DoctorProfile } from "@/lib/types/doctors";

type DoctorDetailState = {
  doctorId: string | null;
  doctor: DoctorProfile | null;
  wallet: DoctorWalletHistory | null;
  loading: boolean;
  walletLoading: boolean;
  saving: boolean;
  error: string | null;
  walletError: string | null;
};

const initialState: DoctorDetailState = {
  doctorId: null,
  doctor: null,
  wallet: null,
  loading: false,
  walletLoading: false,
  saving: false,
  error: null,
  walletError: null,
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

export type DoctorApprovalPushResult =
  | { sent: true; messageId: string }
  | { sent: false; skipped: string }
  | { sent: false; error: string };

export type ApproveDoctorResult = {
  doctor: DoctorProfile;
  push?: DoctorApprovalPushResult;
};

export const fetchDoctorDetail = createAsyncThunk(
  "doctorDetail/fetch",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/doctors/${id}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { doctor: DoctorProfile };
    return body.doctor;
  },
);

export const approveDoctor = createAsyncThunk(
  "doctorDetail/approve",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/doctors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: true }),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as ApproveDoctorResult;
    return body;
  },
);

export const fetchDoctorWallet = createAsyncThunk(
  "doctorDetail/fetchWallet",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/doctors/${id}/wallet`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { history: DoctorWalletHistory };
    return body.history;
  },
);

export const revokeDoctorApproval = createAsyncThunk(
  "doctorDetail/revoke",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/doctors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: false }),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { doctor: DoctorProfile };
    return body.doctor;
  },
);

const doctorDetailSlice = createSlice({
  name: "doctorDetail",
  initialState,
  reducers: {
    clearDoctorDetail(state) {
      state.doctorId = null;
      state.doctor = null;
      state.wallet = null;
      state.error = null;
      state.walletError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorDetail.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.doctorId = action.meta.arg;
      })
      .addCase(fetchDoctorDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.doctor = action.payload;
      })
      .addCase(fetchDoctorDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchDoctorWallet.pending, (state) => {
        state.walletLoading = true;
        state.walletError = null;
      })
      .addCase(fetchDoctorWallet.fulfilled, (state, action) => {
        state.walletLoading = false;
        state.wallet = action.payload;
      })
      .addCase(fetchDoctorWallet.rejected, (state, action) => {
        state.walletLoading = false;
        state.walletError = action.payload as string;
      })
      .addCase(approveDoctor.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(approveDoctor.fulfilled, (state, action) => {
        state.saving = false;
        state.doctor = action.payload.doctor;
      })
      .addCase(approveDoctor.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(revokeDoctorApproval.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(revokeDoctorApproval.fulfilled, (state, action) => {
        state.saving = false;
        state.doctor = action.payload;
      })
      .addCase(revokeDoctorApproval.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const doctorDetailActions = doctorDetailSlice.actions;
export const doctorDetailReducer = doctorDetailSlice.reducer;
