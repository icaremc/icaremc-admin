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
    const body = (await response.json()) as {
      error?: string;
      detail?: string | Array<{ msg?: string }>;
    };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
    if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      return String(body.detail[0].msg);
    }
    return response.statusText || "Request failed";
  } catch {
    return response.statusText || "Request failed";
  }
}

export const fetchPayoutDetail = createAsyncThunk(
  "payoutDetail/fetch",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/admin/payout-requests/${id}`);
      if (!response.ok) {
        return rejectWithValue(await readApiError(response));
      }
      const body = (await response.json()) as {
        request?: DoctorPayoutRequest;
        context?: DoctorPayoutContext;
        error?: string;
        stagingNotFound?: boolean;
      };
      if (!body.request || body.stagingNotFound) {
        return rejectWithValue(body.error ?? "Payout request not found");
      }
      return {
        request: body.request,
        context: body.context ?? null,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Request failed",
      );
    }
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
