"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PushStatus = {
  fcmRegistered: boolean;
  notificationsEnabled: boolean;
  canSend: boolean;
  reason: string | null;
  role: string | null;
};

type Props = {
  userId: string;
  role?: string | null;
};

export default function SendPushForm({ userId, role }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [route, setRoute] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/push`);
      const data = (await response.json()) as PushStatus & { error?: string };

      if (!response.ok) {
        setStatusError(data.error ?? "Could not load push status");
        setStatus(null);
        return;
      }

      setStatus(data);
    } catch {
      setStatusError("Network error while loading push status.");
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setSending(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          route: route.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        ok?: boolean;
        clearedToken?: boolean;
      };

      if (!response.ok) {
        setFeedback({
          type: "error",
          text: data.error ?? "Could not send notification",
        });
        if (data.clearedToken) {
          await loadStatus();
        }
        return;
      }

      setFeedback({ type: "success", text: "Notification sent to the device." });
      setTitle("");
      setBody("");
      setRoute("");
    } catch {
      setFeedback({ type: "error", text: "Network error. Try again." });
    } finally {
      setSending(false);
    }
  }

  const effectiveRole = status?.role ?? role ?? "mother";
  if (effectiveRole !== "mother") {
    return (
      <p className="text-sm text-gray-500">
        Push notifications are only sent to mother accounts with the mobile app
        installed.
      </p>
    );
  }

  const canSend = status?.canSend ?? false;
  const notificationsEnabled = status?.notificationsEnabled ?? true;
  const disabled = !canSend || sending || loadingStatus;

  let badgeLabel = "Checking…";
  let badgeClass = "bg-gray-100 text-gray-700";

  if (!loadingStatus && status) {
    if (canSend) {
      badgeLabel = "Ready to send";
      badgeClass = "bg-emerald-100 text-emerald-800";
    } else if (!status.fcmRegistered) {
      badgeLabel = "No device token";
      badgeClass = "bg-amber-100 text-amber-800";
    } else if (!notificationsEnabled) {
      badgeLabel = "Notifications off in app";
      badgeClass = "bg-amber-100 text-amber-800";
    } else {
      badgeLabel = "Cannot send";
      badgeClass = "bg-amber-100 text-amber-800";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Bell className="h-4 w-4 text-emerald-600" />
          Send push notification
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>

      {loadingStatus ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading FCM token from profile…
        </p>
      ) : null}

      {statusError ? (
        <p className="text-sm text-red-600">{statusError}</p>
      ) : null}

      {!loadingStatus && status && !canSend && status.reason ? (
        <p className="text-sm text-gray-500">{status.reason}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="push-title" className="text-xs font-medium text-gray-600">
            Title
          </label>
          <Input
            id="push-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Reminder"
            maxLength={120}
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="push-route" className="text-xs font-medium text-gray-600">
            In-app route (optional)
          </label>
          <Input
            id="push-route"
            value={route}
            onChange={(event) => setRoute(event.target.value)}
            placeholder="/main"
            maxLength={200}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="push-body" className="text-xs font-medium text-gray-600">
            Message
          </label>
          <Textarea
            id="push-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Your weekly health check-in is due."
            rows={3}
            maxLength={500}
            disabled={disabled}
            required
          />
        </div>
      </div>

      {feedback ? (
        <p
          className={`text-sm ${
            feedback.type === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={disabled || !title.trim() || !body.trim()}>
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send notification"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loadingStatus}
          onClick={() => void loadStatus()}
        >
          Refresh status
        </Button>
      </div>
    </form>
  );
}
