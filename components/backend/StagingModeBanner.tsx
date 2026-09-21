"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { isBackendApiEnabled } from "@/lib/backend/config";
import {
  getStagingCapability,
  isStagingFeatureAvailable,
  STAGING_CAPABILITIES,
} from "@/lib/backend/capabilities";

export function StagingModeBanner() {
  if (!isBackendApiEnabled()) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      Staging API mode — data from{" "}
      <a
        href="https://icaremc-backend.onrender.com/docs"
        target="_blank"
        rel="noreferrer"
        className="font-medium underline"
      >
        icaremc-backend.onrender.com
      </a>
      . Production users are unaffected.
    </div>
  );
}

export function StagingUnavailablePanel({ pathname }: { pathname: string }) {
  const cap = getStagingCapability(pathname);
  const available = STAGING_CAPABILITIES.filter((item) => item.backendHint);

  return (
    <div className="admin-page">
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="space-y-3">
            <div>
              <h1 className="text-lg font-semibold">
                Not on staging API yet
              </h1>
              <p className="mt-1 text-sm text-amber-900/80">
                {cap?.label ?? "This area"} exists in the current production admin
                (Supabase), but there is no matching endpoint on the Render staging
                backend. It is hidden here so we do not mix prod data into staging.
              </p>
            </div>
            <p className="text-sm">
              Use production admin for this feature until the backend adds it.
            </p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Available on staging
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-amber-900/90">
                {available.map((item) => (
                  <li key={item.pathPrefix}>
                    <Link href={item.pathPrefix} className="underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/admin/dashboard"
              className="inline-flex text-sm font-medium text-emerald-800 underline"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StagingRouteGate({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  if (!isBackendApiEnabled()) return <>{children}</>;
  if (isStagingFeatureAvailable(pathname)) return <>{children}</>;
  return <StagingUnavailablePanel pathname={pathname} />;
}
