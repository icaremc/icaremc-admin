import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AppointmentDetailPayload } from "@/lib/types/chat";
import type { DoctorProfile } from "@/lib/types/doctors";

type AppointmentDetailState = {
  appointmentId: string | null;
  detail: AppointmentDetailPayload | null;
  loading: boolean;
  error: string | null;
};

const initialState: AppointmentDetailState = {
  appointmentId: null,
  detail: null,
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

async function attachDoctorProfile(
  detail: AppointmentDetailPayload,
): Promise<AppointmentDetailPayload> {
  const appointment = detail.appointment;
  if (!appointment?.doctor_id) return detail;
  const existing = appointment.doctor_profiles;
  if (existing?.first_name || existing?.last_name) return detail;

  try {
    const response = await fetch("/api/admin/doctors");
    if (!response.ok) return detail;
    const body = (await response.json()) as { doctors?: DoctorProfile[] };
    const doctor = (body.doctors ?? []).find(
      (row) => row.id === appointment.doctor_id,
    );
    if (!doctor) return detail;
    return {
      ...detail,
      appointment: {
        ...appointment,
        doctor_profiles: {
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          specialty:
            doctor.doctor_categories?.name ?? doctor.specialty ?? "",
          hospital: doctor.hospital ?? "",
        },
      },
    };
  } catch {
    return detail;
  }
}

export const fetchAppointmentDetail = createAsyncThunk(
  "appointmentDetail/fetch",
  async (id: string, { rejectWithValue }) => {
    const response = await fetch(`/api/admin/appointments/${id}`);
    if (!response.ok) {
      return rejectWithValue(await readApiError(response));
    }
    const detail = (await response.json()) as AppointmentDetailPayload;
    return attachDoctorProfile(detail);
  },
);

const appointmentDetailSlice = createSlice({
  name: "appointmentDetail",
  initialState,
  reducers: {
    clearAppointmentDetail(state) {
      state.appointmentId = null;
      state.detail = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointmentDetail.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.appointmentId = action.meta.arg;
      })
      .addCase(fetchAppointmentDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.detail = action.payload;
      })
      .addCase(fetchAppointmentDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const appointmentDetailActions = appointmentDetailSlice.actions;
export const appointmentDetailReducer = appointmentDetailSlice.reducer;
