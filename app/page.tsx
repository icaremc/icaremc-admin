"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { authActions, login, restoreSession } from "@/app/store/slices/authSlice";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(restoreSession()).then((result) => {
      if (restoreSession.fulfilled.match(result) && result.payload) {
        const next = params.get("next") || "/admin/dashboard";
        router.replace(next);
      }
    });

    const err = params.get("error");
    if (err) {
      const map: Record<string, string> = {
        unauthorized: "You are not authorized to access that page.",
        auth: "Authentication is required. Please sign in.",
        timeout: "Session check timed out. Please sign in again.",
      };
      setError(map[err] ?? "Please sign in to continue.");
    }
  }, [dispatch, router, params]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      const next = params.get("next") || "/admin/dashboard";
      router.replace(next);
    }
  }, [authStatus, router, params]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    dispatch(authActions.clearAuthError());

    const result = await dispatch(login({ email, password }));
    if (login.rejected.match(result)) {
      setError(result.payload ?? "Failed to sign in.");
    }
  };

  const loading = authStatus === "loading";

  return (
    <div className="grid min-h-screen place-items-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-sm font-bold text-white">
            IC
          </div>
          <h1 className="text-lg font-semibold text-gray-900">ICare MC Admin</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign in with your authorized admin account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="mt-1"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
