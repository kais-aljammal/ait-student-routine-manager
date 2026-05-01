"use client";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-neutral-50 px-4 py-8 sm:px-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-neutral-600">
          We hit an unexpected issue while loading the dashboard. Please retry.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
