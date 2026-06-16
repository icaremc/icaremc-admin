"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Result = {
  ok: boolean;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  error?: string;
};

function BroadcastForm({
  title,
  description,
  endpoint,
  extraBody,
}: {
  title: string;
  description: string;
  endpoint: string;
  extraBody?: Record<string, unknown>;
}) {
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [route, setRoute] = useState("/main");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSend() {
    setResult(null);
    if (!pushTitle.trim() || !pushBody.trim()) return;

    const confirmed = window.confirm(
      `Send this push notification to ${title.toLowerCase()}?`,
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pushTitle,
          body: pushBody,
          route: route.trim() || undefined,
          ...(extraBody ?? {}),
        }),
      });

      const data = (await response.json()) as Result;
      if (!response.ok) {
        setResult({
          ok: false,
          attempted: 0,
          sent: 0,
          skipped: 0,
          failed: 0,
          error: (data as any).error ?? "Could not send broadcast push",
        });
        return;
      }

      setResult(data);
      setPushTitle("");
      setPushBody("");
    } catch {
      setResult({
        ok: false,
        attempted: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        error: "Network error. Try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="admin-panel space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Title</label>
          <Input
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
            placeholder="Announcement"
            maxLength={120}
            disabled={sending}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">In-app route</label>
          <Input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="/main"
            maxLength={200}
            disabled={sending}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-gray-600">Message</label>
          <Textarea
            value={pushBody}
            onChange={(e) => setPushBody(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={sending}
          />
        </div>
      </div>

      {result ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.ok ? (
            <span>
              Attempted {result.attempted}. Sent {result.sent}. Skipped {result.skipped}. Failed {result.failed}.
            </span>
          ) : (
            <span>{result.error ?? "Broadcast failed"}</span>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={handleSend}
        disabled={sending || !pushTitle.trim() || !pushBody.trim()}
      >
        {sending ? "Sending…" : "Send broadcast"}
      </Button>
      <p className="text-xs text-gray-500">
        Broadcast push is restricted to <span className="font-medium">super admins</span>.
      </p>
    </section>
  );
}

export default function PushPage() {
  return (
    <>
      <PageHero
        title="Push notifications"
        description="Send a push notification to individual users/doctors or broadcast to all."
        icon={Megaphone}
        stat={{ label: "Audience", value: "Doctors + Mothers" }}
      />

      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8 lg:px-8">
        <BroadcastForm
          title="Broadcast to verified doctors"
          description="Sends to all verified doctors who have a device token and notifications enabled."
          endpoint="/api/admin/doctors/push"
          extraBody={{ verifiedOnly: true }}
        />

        <BroadcastForm
          title="Broadcast to mothers"
          description="Sends to all mother accounts with a device token and notifications enabled."
          endpoint="/api/admin/users/push"
          extraBody={{ role: "mother" }}
        />
      </div>
    </>
  );
}

