import { configureStore } from "@reduxjs/toolkit";
import { appointmentsReducer } from "@/features/appointments/appointmentsSlice";
import { childrenReducer } from "@/features/children/childrenSlice";
import { contentReducer } from "@/features/content/contentSlice";
import { dashboardReducer } from "@/features/dashboard/dashboardSlice";
import { mothersReducer } from "@/features/mothers/mothersSlice";
import { pregnancyLogsReducer } from "@/features/pregnancyLogs/pregnancyLogsSlice";
import { dailyTipsReducer } from "@/features/dailyTips/dailyTipsSlice";
import { pregnancyWeeksReducer } from "@/features/pregnancyWeeks/pregnancyWeeksSlice";
import { profilesReducer } from "@/features/profiles/profilesSlice";
import { authReducer } from "./slices/authSlice";
import { uiReducer } from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    dashboard: dashboardReducer,
    content: contentReducer,
    profiles: profilesReducer,
    pregnancyWeeks: pregnancyWeeksReducer,
    dailyTips: dailyTipsReducer,
    mothers: mothersReducer,
    pregnancyLogs: pregnancyLogsReducer,
    children: childrenReducer,
    appointments: appointmentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

