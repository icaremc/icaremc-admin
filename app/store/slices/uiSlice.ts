import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type UiState = {
  sidebarCollapsed: boolean;
};

const initialState: UiState = {
  sidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const uiReducer = uiSlice.reducer;
export const uiActions = uiSlice.actions;

