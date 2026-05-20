import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-start gap-6 bg-slate-950 px-4 pb-10 pt-14 text-white sm:justify-center sm:gap-8 sm:p-8 sm:pt-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950 pointer-events-none" />

      <Link
        href="/"
        className="absolute left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-20 sm:left-10 sm:top-8 hover:opacity-90 transition-opacity touch-manipulation"
        aria-label="Routine.ai — home"
      >
        <BrandLogo className="text-base font-bold tracking-tight sm:text-xl" />
      </Link>

      <div className="z-10 mx-auto mt-8 w-full max-w-2xl text-center sm:mt-0">
        <h1 className="text-[1.65rem] font-extrabold leading-snug tracking-tight sm:text-5xl md:text-6xl">
          AI Student{" "}
          <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] sm:inline sm:bg-gradient-to-r sm:from-cyan-400 sm:to-blue-500">
            Routine Manager
          </span>
        </h1>
        <p className="mt-4 px-1 text-base leading-relaxed text-blue-200/80 sm:mt-6 sm:text-lg">
          Turn your chaotic schedule into a structured, optimized, and stress-free timeline.
          Powered by AI. Designed for students.
        </p>
      </div>

      <nav className="z-10 mt-2 flex w-full max-w-sm flex-col gap-3 px-2 text-sm sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
        <Link
          href="/login"
          className="min-h-11 shrink-0 touch-manipulation rounded-xl border border-blue-800/50 bg-slate-900/50 px-6 py-3 text-center font-medium text-blue-100 transition-colors hover:bg-slate-800 sm:w-auto backdrop-blur-md"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="min-h-11 shrink-0 touch-manipulation rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-center font-semibold text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:-translate-y-0.5 sm:w-auto sm:px-8"
        >
          Get Started
        </Link>
      </nav>

      <div className="z-10 mt-4 w-full max-w-4xl rounded-2xl border border-blue-900/30 bg-slate-900/40 p-3 backdrop-blur-xl shadow-2xl sm:mt-12 sm:p-4">
        <div className="flex items-center gap-2 mb-4 border-b border-blue-900/30 pb-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-2 rounded-xl bg-slate-950/50 p-4 border border-blue-900/20 sm:p-6">
            <h3 className="text-cyan-400 font-medium mb-1">Current Task</h3>
            <p className="text-xl font-semibold mb-4 sm:text-2xl">Deep Work: Physics Lab</p>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 w-2/3 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            </div>
          </div>
          <div className="col-span-1 rounded-xl bg-slate-950/50 p-4 border border-blue-900/20 sm:p-6">
            <h3 className="text-blue-300 font-medium mb-1">Up Next</h3>
            <p className="font-semibold">Dinner Break</p>
            <p className="text-xs text-blue-200/60 mt-1">18:30 - 19:15</p>
          </div>
        </div>
      </div>
    </main>
  );
}
