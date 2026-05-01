"use client";

import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function getCallbackUrl() {
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "";
  const tzPart = tz ? `&tz=${encodeURIComponent(tz)}` : "";
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback?next=/dashboard${tzPart}`;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/auth/callback?next=/dashboard${tzPart}`;
}

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signError } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getCallbackUrl(),
            data: {
              full_name: fullName.trim(),
              timezone:
                typeof Intl !== "undefined"
                  ? Intl.DateTimeFormat().resolvedOptions().timeZone
                  : undefined,
            },
          },
        }),
        10_000,
      );
      if (signError) {
        setError(signError.message);
        return;
      }
      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setInfo(
        "Check your email for a confirmation link. After you confirm, you can sign in.",
      );
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
        <h1 className="text-xl font-semibold text-white">Create account</h1>
        <p className="mt-1 text-sm text-blue-200/70">
          Your display name is stored on your profile when the account is created.
        </p>
      </div>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {info}
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-blue-100">Full name</span>
        <input
          name="fullName"
          type="text"
          autoComplete="name"
          required
          minLength={1}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-white placeholder-blue-300/30 outline-none ring-cyan-400/50 focus:border-cyan-400 focus:ring-2 transition-all"
        />
      </label>
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
          autoComplete="new-password"
          required
          minLength={6}
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
        {loading ? "Creating account…" : "Sign up"}
      </button>
      <p className="text-center text-sm text-blue-200/70 mt-2">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300">
          Sign in
        </Link>
      </p>
    </form>
  );
}
