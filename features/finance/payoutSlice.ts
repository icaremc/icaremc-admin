import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { DoctorPayoutRequest } from "@/lib/types/finance";

export type ChapaTransferResult = {
  message: string;
  txRef: string;
  transferId: string;
  holderName: string;
  bankName: string;
  accountNumber: string;
  amount: string | number;
};

type PayoutState = {
  requests: DoctorPayoutRequest[];
  loading: boolean;
  savingId: string | null;
  error: string | null;
};

const initialState: PayoutState = {
  requests: [],
  loading: false,
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

export const fetchPayoutRequests = createAsyncThunk(
  "payout/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/payout-requests");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { requests: DoctorPayoutRequest[] };
    return body.requests;
  },
);

export const updatePayoutRequest = createAsyncThunk(
  "payout/update",
  async (
    payload: { id: string; action: "approve" | "reject" | "complete"; adminNote?: string },
    { rejectWithValue },
  ) => {
    const response = await fetch(`/api/admin/payout-requests/${payload.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: payload.action,
        adminNote: payload.adminNote,
      }),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { request: DoctorPayoutRequest };
    return body.request;
  },
);

export const sendPayoutViaChapa = createAsyncThunk(
  "payout/sendViaChapa",
  async (payload: { id: string }, { rejectWithValue }) => {
    const response = await fetch("/api/admin/payout-requests/chapa-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutRequestId: payload.id }),
    });
    const body = (await response.json()) as {
      error?: string;
      message?: string;
      tx_ref?: string;
      transfer_id?: string;
      destination?: {
        holder_name?: string;
        bank_name?: string;
        account_number?: string;
      };
      amount?: string | number;
    };
    if (!response.ok) {
      return rejectWithValue(body.error ?? "Failed to send payout via Chapa");
    }

    return {
      message: body.message ?? "Transfer initiated",
      txRef: body.tx_ref ?? "",
      transferId: body.transfer_id ?? "",
      holderName: body.destination?.holder_name ?? "",
      bankName: body.destination?.bank_name ?? "",
      accountNumber: body.destination?.account_number ?? "",
      amount: body.amount ?? 0,
    } satisfies ChapaTransferResult;
  },
);

export const verifyPayoutViaChapa = createAsyncThunk(
  "payout/verifyViaChapa",
  async (payload: { id: string }, { rejectWithValue }) => {
    const response = await fetch("/api/admin/payout-requests/chapa-verify-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutRequestId: payload.id }),
    });
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    return payload.id;
  },
);

const payoutSlice = createSlice({
  name: "payout",
  initialState,
  reducers: {
    clearPayoutError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayoutRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayoutRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchPayoutRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updatePayoutRequest.pending, (state, action) => {
        state.savingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updatePayoutRequest.fulfilled, (state, action) => {
        state.savingId = null;
        const index = state.requests.findIndex((r) => r.id === action.payload.id);
        if (index >= 0) state.requests[index] = action.payload;
      })
      .addCase(updatePayoutRequest.rejected, (state, action) => {
        state.savingId = null;
        state.error = action.payload as string;
      })
      .addCase(sendPayoutViaChapa.pending, (state, action) => {
        state.savingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(sendPayoutViaChapa.fulfilled, (state) => {
        state.savingId = null;
      })
      .addCase(sendPayoutViaChapa.rejected, (state, action) => {
        state.savingId = null;
        state.error = action.payload as string;
      })
      .addCase(verifyPayoutViaChapa.pending, (state, action) => {
        state.savingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(verifyPayoutViaChapa.fulfilled, (state) => {
        state.savingId = null;
      })
      .addCase(verifyPayoutViaChapa.rejected, (state, action) => {
        state.savingId = null;
        state.error = action.payload as string;
      });
  },
});

export const payoutActions = payoutSlice.actions;
export const payoutReducer = payoutSlice.reducer;
