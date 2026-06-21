import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { WalletTransaction } from "@/lib/types/finance";

type WalletTransactionsState = {
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
};

const initialState: WalletTransactionsState = {
  transactions: [],
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

export const fetchWalletTransactions = createAsyncThunk(
  "walletTransactions/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/admin/wallet-transactions");
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const body = (await response.json()) as { transactions: WalletTransaction[] };
    return body.transactions;
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
        state.transactions = action.payload;
      })
      .addCase(fetchWalletTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const walletTransactionsReducer = walletTransactionsSlice.reducer;
