import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 p-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950 pointer-events-none" />

      <Link
        href="/"
        className="absolute left-6 top-6 z-20 sm:left-10 sm:top-8 hover:opacity-90 transition-opacity"
        aria-label="Routine.ai — home"
      >
        <BrandLogo className="text-lg font-bold tracking-tight sm:text-xl" />
      </Link>
      
      <div className="z-10 text-center max-w-2xl">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          AI Student <br />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            Routine Manager
          </span>
        </h1>
        <p className="mt-6 text-lg text-blue-200/80">
          Turn your chaotic schedule into a structured, optimized, and stress-free timeline. 
          Powered by AI. Designed for students.
        </p>
      </div>

      <nav className="z-10 flex flex-wrap justify-center gap-4 text-sm mt-4">
        <Link
          href="/login"
          className="rounded-xl border border-blue-800/50 bg-slate-900/50 px-6 py-3 font-medium text-blue-100 hover:bg-slate-800 transition-colors backdrop-blur-md"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-semibold text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all hover:-translate-y-0.5"
        >
          Get Started
        </Link>
      </nav>

      <div className="z-10 mt-12 w-full max-w-4xl rounded-2xl border border-blue-900/30 bg-slate-900/40 p-4 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-2 mb-4 border-b border-blue-900/30 pb-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-2 rounded-xl bg-slate-950/50 p-6 border border-blue-900/20">
            <h3 className="text-cyan-400 font-medium mb-1">Current Task</h3>
            <p className="text-2xl font-semibold mb-4">Deep Work: Physics Lab</p>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 w-2/3 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            </div>
          </div>
          <div className="col-span-1 rounded-xl bg-slate-950/50 p-6 border border-blue-900/20">
            <h3 className="text-blue-300 font-medium mb-1">Up Next</h3>
            <p className="font-semibold">Dinner Break</p>
            <p className="text-xs text-blue-200/60 mt-1">18:30 - 19:15</p>
          </div>
        </div>
      </div>
    </main>
  );
}
