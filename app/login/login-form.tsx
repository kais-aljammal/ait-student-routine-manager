"use client";

import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const urlError = searchParams.get("error");
  const urlAuthMessage =
    urlError === "auth"
      ? "Email link is invalid or expired. Try signing in again."
      : urlError === "profile"
        ? "Your account is signed in, but your profile could not be loaded. Apply the latest database migration (profiles insert policy) or contact support."
        : null;
  const displayError = error ?? urlAuthMessage;


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        10_000,
      );
      if (signError) {
        setError(signError.message);
        return;
      }
      const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      // Full navigation so the next document request includes auth cookies reliably (App Router + SSR).
      window.location.assign(safeNext);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Connection problem. Please check your internet and try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 rounded-2xl border border-blue-900/30 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl"
    >
      <div>
        <h1 className="text-xl font-semibold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-blue-200/70">
          Welcome back. Enter your credentials to continue.
        </p>
      </div>
      {displayError && (
        <div className="space-y-3">
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {displayError}
          </p>
          {urlError === "profile" && (
            <button
              type="button"
              className="w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-slate-800"
              onClick={() => {
                void (async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.assign("/login");
                })();
              }}
            >
              Sign out and try again
            </button>
          )}
        </div>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-blue-100">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-white placeholder-blue-300/30 outline-none ring-cyan-400/50 focus:border-cyan-400 focus:ring-2 transition-all"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-blue-100">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-white placeholder-blue-300/30 outline-none ring-cyan-400/50 focus:border-cyan-400 focus:ring-2 transition-all"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-blue-200/70 mt-2">
        No account?{" "}
        <Link href="/signup" className="font-medium text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300">
          Sign up
        </Link>
      </p>
    </form>
  );
}
