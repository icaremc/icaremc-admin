import { configureStore } from "@reduxjs/toolkit";
import { adminsReducer } from "@/features/admins/adminsSlice";
import { appointmentsReducer } from "@/features/appointments/appointmentsSlice";
import { childrenReducer } from "@/features/children/childrenSlice";
import { contentReducer } from "@/features/content/contentSlice";
import { dashboardReducer } from "@/features/dashboard/dashboardSlice";
import { pregnanciesReducer } from "@/features/pregnancies/pregnanciesSlice";
import { pregnancyLogsReducer } from "@/features/pregnancyLogs/pregnancyLogsSlice";
import { symptomLogsReducer } from "@/features/symptomLogs/symptomLogsSlice";
import { dailyTipsReducer } from "@/features/dailyTips/dailyTipsSlice";
import { pregnancyWeeksReducer } from "@/features/pregnancyWeeks/pregnancyWeeksSlice";
import { profilesReducer } from "@/features/profiles/profilesSlice";
import { userDetailReducer } from "@/features/users/userDetailSlice";
import { authReducer } from "./slices/authSlice";
import { uiReducer } from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    dashboard: dashboardReducer,
    content: contentReducer,
    profiles: profilesReducer,
    userDetail: userDetailReducer,
    admins: adminsReducer,
    pregnancyWeeks: pregnancyWeeksReducer,
    dailyTips: dailyTipsReducer,
    pregnancies: pregnanciesReducer,
    pregnancyLogs: pregnancyLogsReducer,
    symptomLogs: symptomLogsReducer,
    children: childrenReducer,
    appointments: appointmentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

