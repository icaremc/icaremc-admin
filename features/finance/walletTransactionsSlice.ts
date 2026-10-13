import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { DEFAULT_PAGE_SIZE } from "@/lib/listPagination";
import type { WalletTransaction } from "@/lib/types/finance";

type WalletTransactionsState = {
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  limit: number;
  hasMore: boolean;
};

const initialState: WalletTransactionsState = {
  transactions: [],
  loading: false,
  error: null,
  limit: DEFAULT_PAGE_SIZE,
  hasMore: false,
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

export const fetchWalletTransactions = createAsyncThunk(
  "walletTransactions/fetchAll",
  async (
    args: { limit?: number } | undefined,
    { rejectWithValue },
  ) => {
    const limit = args?.limit ?? DEFAULT_PAGE_SIZE;
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await fetch(
      `/api/admin/wallet-transactions?${params.toString()}`,
    );
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as {
      transactions: WalletTransaction[];
      pagination?: { hasMore: boolean; limit: number };
    };
    return {
      transactions: body.transactions,
      limit,
      hasMore: body.pagination?.hasMore ?? body.transactions.length >= limit,
    };
  },
);

const walletTransactionsSlice = createSlice({
  name: "walletTransactions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalletTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions;
        state.limit = action.payload.limit;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchWalletTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const walletTransactionsReducer = walletTransactionsSlice.reducer;
