import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PatientWithdrawalRequest } from "@/lib/types/finance";

type PatientWalletSummary = {
  balance: number;
  currency: string;
} | null;

type PatientWithdrawalState = {
  requests: PatientWithdrawalRequest[];
  detail: PatientWithdrawalRequest | null;
  wallet: PatientWalletSummary;
  loading: boolean;
  detailLoading: boolean;
  savingId: string | null;
  error: string | null;
};

const initialState: PatientWithdrawalState = {
  requests: [],
  detail: null,
  wallet: null,
  loading: false,
  detailLoading: false,
  savingId: null,
  error: null,
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

export const fetchPatientWithdrawals = createAsyncThunk(
  "patientWithdrawals/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/patient-withdrawals");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as {
      requests: PatientWithdrawalRequest[];
    };
    return body.requests;
  },
);

export const fetchPatientWithdrawalDetail = createAsyncThunk(
  "patientWithdrawals/fetchDetail",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/patient-withdrawals/${id}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as {
      request: PatientWithdrawalRequest;
      wallet?: PatientWalletSummary;
    };
    return {
      request: body.request,
      wallet: body.wallet ?? null,
    };
  },
);

export const updatePatientWithdrawal = createAsyncThunk(
  "patientWithdrawals/update",
  async (
    payload: {
      id: string;
      action: "approve" | "reject";
      adminNote?: string;
    },
    { rejectWithValue },
  ) => {
    const response = await fetch(
      `/api/admin/patient-withdrawals/${payload.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: payload.action,
          adminNote: payload.adminNote,
        }),
      },
    );
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as {
      request: PatientWithdrawalRequest;
    };
    return body.request;
  },
);

const patientWithdrawalSlice = createSlice({
  name: "patientWithdrawals",
  initialState,
  reducers: {
    clearPatientWithdrawalError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatientWithdrawals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientWithdrawals.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchPatientWithdrawals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchPatientWithdrawalDetail.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchPatientWithdrawalDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detail = action.payload.request;
        state.wallet = action.payload.wallet;
      })
      .addCase(fetchPatientWithdrawalDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updatePatientWithdrawal.pending, (state, action) => {
        state.savingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updatePatientWithdrawal.fulfilled, (state, action) => {
        state.savingId = null;
        state.detail = action.payload;
        const index = state.requests.findIndex(
          (r) => r.id === action.payload.id,
        );
        if (index >= 0) state.requests[index] = action.payload;
      })
      .addCase(updatePatientWithdrawal.rejected, (state, action) => {
        state.savingId = null;
        state.error = action.payload as string;
      });
  },
});

export const patientWithdrawalActions = patientWithdrawalSlice.actions;
export const patientWithdrawalReducer = patientWithdrawalSlice.reducer;
