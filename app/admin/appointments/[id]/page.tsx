"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  Loader2,
  MessageSquare,
  Stethoscope,
  User,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchAppointmentDetail,
} from "@/features/appointments/appointmentDetailSlice";
import {
  fetchBookingStats,
  updateAppointmentStatus,
} from "@/features/appointments/appointmentsSlice";
import {
  APPOINTMENT_STATUSES,
  formatAppointmentDate,
} from "@/lib/appointments/status";
import {
  appointmentStatusClass,
  doctorLabel,
  formatMoney,
  nextStatusActions,
  patientLabel,
  patientPhone,
  statusActionLabel,
} from "@/lib/appointments/display";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types/chat";
import type { Appointment, AppointmentStatus } from "@/lib/types/doctors";

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        appointmentStatusClass(status),
      )}
    >
      {status}
    </span>
  );
}

function PaymentBadge({ appt }: { appt: Appointment }) {
  const styles: Record<Appointment["payment_status"], string> = {
    paid: "bg-emerald-50 text-emerald-700",
    partial: "bg-amber-50 text-amber-700",
    unpaid: "bg-gray-100 text-gray-600",
    waived: "bg-gray-100 text-gray-600",
  };
  const labels: Record<Appointment["payment_status"], string> = {
    paid: "Paid",
    partial: "Partial payment",
    unpaid: "Unpaid",
    waived: "Waived",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        styles[appt.payment_status],
      )}
    >
      {labels[appt.payment_status]}
    </span>
  );
}

function ChatHistory({
  messages,
  patientId,
  patientName,
  doctorName,
}: {
  messages: ChatMessage[];
  patientId: string;
  patientName: string;
  doctorName: string;
}) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-10 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-3 text-sm font-medium text-gray-700">No messages yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Chat opens when the patient and doctor start messaging in the app.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[32rem] space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/80 p-4">
      {messages.map((message) => {
        const isPatient = message.sender_id === patientId;
        const senderName = isPatient ? patientName : doctorName;

        return (
          <div
            key={message.id}
            className={cn("flex", isPatient ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 shadow-sm",
                isPatient
                  ? "rounded-bl-md border border-gray-200 bg-white text-gray-900"
                  : "rounded-br-md bg-emerald-600 text-white",
              )}
            >
              <p
                className={cn(
                  "text-xs font-medium",
                  isPatient ? "text-gray-500" : "text-emerald-100",
                )}
              >
                {senderName}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {message.body}
              </p>
              <p
                className={cn(
                  "mt-1.5 text-[11px]",
                  isPatient ? "text-gray-400" : "text-emerald-100/80",
                )}
              >
                {formatDateTime(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const appointmentId = typeof params.id === "string" ? params.id : "";
  const dispatch = useAppDispatch();
  const { detail, loading, error } = useAppSelector((state) => state.appointmentDetail);
  const savingId = useAppSelector((state) => state.appointments.savingId);

  useEffect(() => {
    if (appointmentId) {
      dispatch(fetchAppointmentDetail(appointmentId));
    }
  }, [dispatch, appointmentId]);

  const appt = detail?.appointment;
  const isSaving = Boolean(appt && savingId === appt.id);
  const quickActions = appt ? nextStatusActions(appt.status) : [];

  function handleStatusChange(status: AppointmentStatus) {
    if (!appt || status === appt.status) return;
    dispatch(updateAppointmentStatus({ id: appt.id, status })).then((result) => {
      if (updateAppointmentStatus.fulfilled.match(result)) {
        dispatch(fetchBookingStats());
        dispatch(fetchAppointmentDetail(appt.id));
      }
    });
  }

  const heroTitle = appt
    ? `${formatAppointmentDate(appt.appointment_date)} · ${appt.time_slot}`
    : "Appointment";

  return (
    <>
      <PageHero
        title={heroTitle}
        description="Booking details and patient–doctor chat"
        icon={CalendarCheck}
        stat={{
          label: "Messages",
          value: detail?.messages.length ?? 0,
        }}
      />

      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8 lg:px-8">
        <Link
          href="/admin/appointments"
          className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </Link>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading && !detail ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading appointment…
          </div>
        ) : null}

        {appt ? (
          <>
            <section className="admin-panel space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={appt.status} />
                  {appt.total_amount > 0 ? <PaymentBadge appt={appt} /> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={status === "cancelled" ? "outline" : "default"}
                      disabled={isSaving}
                      className={cn(
                        status === "cancelled" && "text-red-700 hover:text-red-800",
                      )}
                      onClick={() => handleStatusChange(status)}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        statusActionLabel(status)
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Date</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                    <CalendarCheck className="h-4 w-4 text-emerald-600" />
                    {formatAppointmentDate(appt.appointment_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Time</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    {appt.time_slot}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Booked</p>
                  <p className="mt-0.5 text-sm text-gray-900">
                    {formatDateTime(appt.created_at)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Patient</p>
                  <Link
                    href={`/admin/users/${appt.patient_id}`}
                    className="mt-1 inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
                  >
                    <User className="h-4 w-4" />
                    {patientLabel(appt)}
                  </Link>
                  {patientPhone(appt) ? (
                    <p className="mt-0.5 text-sm text-gray-500">{patientPhone(appt)}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Doctor</p>
                  <Link
                    href={`/admin/doctors/${appt.doctor_id}`}
                    className="mt-1 inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
                  >
                    <Stethoscope className="h-4 w-4" />
                    {doctorLabel(appt)}
                  </Link>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {[
                      appt.doctor_profiles?.specialty,
                      appt.doctor_profiles?.hospital,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
              </div>

              {appt.service_name || appt.note?.trim() || appt.total_amount > 0 ? (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  {appt.service_name ? (
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">Service</p>
                      <p className="mt-0.5 text-sm text-gray-900">
                        {appt.service_name}
                        {appt.service_price != null
                          ? ` · ${formatMoney(appt.service_price, appt.currency)}`
                          : ""}
                      </p>
                      {appt.service_description ? (
                        <p className="mt-1 text-sm text-gray-600">
                          {appt.service_description}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {appt.note?.trim() ? (
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">Note</p>
                      <p className="mt-0.5 text-sm text-gray-800">{appt.note}</p>
                    </div>
                  ) : null}
                  {appt.total_amount > 0 ? (
                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs font-medium uppercase text-gray-500">Total</dt>
                        <dd className="mt-0.5 font-medium text-gray-900">
                          {formatMoney(appt.total_amount, appt.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase text-gray-500">Paid</dt>
                        <dd className="mt-0.5 font-medium text-gray-900">
                          {formatMoney(appt.amount_paid, appt.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase text-gray-500">
                          Prepayment
                        </dt>
                        <dd className="mt-0.5 font-medium capitalize text-gray-900">
                          {appt.prepayment_mode === "none"
                            ? "None"
                            : appt.prepayment_mode === "full"
                              ? "Full"
                              : `${appt.prepayment_percent ?? 0}%`}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                <label className="text-xs font-medium uppercase text-gray-500">
                  Change status
                </label>
                <select
                  value={appt.status}
                  disabled={isSaving}
                  onChange={(event) =>
                    handleStatusChange(event.target.value as AppointmentStatus)
                  }
                  className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 disabled:opacity-50"
                >
                  {APPOINTMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="admin-section-title flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  Chat history
                </h2>
                {detail?.conversation?.last_message_at ? (
                  <p className="text-sm text-gray-500">
                    Last message {formatDateTime(detail.conversation.last_message_at)}
                  </p>
                ) : null}
              </div>
              <ChatHistory
                messages={detail?.messages ?? []}
                patientId={appt.patient_id}
                patientName={patientLabel(appt)}
                doctorName={doctorLabel(appt)}
              />
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}
