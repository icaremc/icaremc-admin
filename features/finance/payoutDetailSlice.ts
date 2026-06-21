import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { DoctorPayoutContext } from "@/lib/finance/doctorPayoutContext";
import type { DoctorPayoutRequest } from "@/lib/types/finance";

type PayoutDetailState = {
  request: DoctorPayoutRequest | null;
  context: DoctorPayoutContext | null;
  loading: boolean;
  error: string | null;
};

const initialState: PayoutDetailState = {
  request: null,
  context: null,
  loading: false,
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

export const fetchPayoutDetail = createAsyncThunk(
  "payoutDetail/fetch",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/payout-requests/${id}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as {
      request: DoctorPayoutRequest;
      context: DoctorPayoutContext;
    };
    return body;
  },
);

const payoutDetailSlice = createSlice({
  name: "payoutDetail",
  initialState,
  reducers: {
    clearPayoutDetail(state) {
      state.request = null;
      state.context = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayoutDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayoutDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.request = action.payload.request;
        state.context = action.payload.context;
      })
      .addCase(fetchPayoutDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPayoutDetail } = payoutDetailSlice.actions;
export const payoutDetailReducer = payoutDetailSlice.reducer;
