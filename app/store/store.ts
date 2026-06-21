import { configureStore } from "@reduxjs/toolkit";
import { adminsReducer } from "@/features/admins/adminsSlice";
import { appointmentsReducer } from "@/features/appointments/appointmentsSlice";
import { appointmentDetailReducer } from "@/features/appointments/appointmentDetailSlice";
import { doctorsReducer } from "@/features/doctors/doctorsSlice";
import { doctorDetailReducer } from "@/features/doctors/doctorDetailSlice";
import { doctorCategoriesReducer } from "@/features/doctorCategories/doctorCategoriesSlice";
import { hospitalsReducer } from "@/features/hospitals/hospitalsSlice";
import { childrenReducer } from "@/features/children/childrenSlice";
import { contentReducer } from "@/features/content/contentSlice";
import { dashboardReducer } from "@/features/dashboard/dashboardSlice";
import { dashboardAnalyticsReducer } from "@/features/dashboard/dashboardAnalyticsSlice";
import { pregnanciesReducer } from "@/features/pregnancies/pregnanciesSlice";
import { pregnancyLogsReducer } from "@/features/pregnancyLogs/pregnancyLogsSlice";
import { dailyTipsReducer } from "@/features/dailyTips/dailyTipsSlice";
import { pregnancyWeeksReducer } from "@/features/pregnancyWeeks/pregnancyWeeksSlice";
import { profilesReducer } from "@/features/profiles/profilesSlice";
import { userDetailReducer } from "@/features/users/userDetailSlice";
import { payoutReducer } from "@/features/finance/payoutSlice";
import { payoutDetailReducer } from "@/features/finance/payoutDetailSlice";
import { walletTransactionsReducer } from "@/features/finance/walletTransactionsSlice";
import { activityLogsReducer } from "@/features/activity/activityLogsSlice";
import { authReducer } from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    dashboardAnalytics: dashboardAnalyticsReducer,
    content: contentReducer,
    profiles: profilesReducer,
    userDetail: userDetailReducer,
    admins: adminsReducer,
    pregnancyWeeks: pregnancyWeeksReducer,
    dailyTips: dailyTipsReducer,
    pregnancies: pregnanciesReducer,
    pregnancyLogs: pregnancyLogsReducer,
    children: childrenReducer,
    doctors: doctorsReducer,
    doctorDetail: doctorDetailReducer,
    doctorCategories: doctorCategoriesReducer,
    hospitals: hospitalsReducer,
    appointments: appointmentsReducer,
    appointmentDetail: appointmentDetailReducer,
    payout: payoutReducer,
    payoutDetail: payoutDetailReducer,
    walletTransactions: walletTransactionsReducer,
    activityLogs: activityLogsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

