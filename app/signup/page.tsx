import { SignupForm } from "./signup-form";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function SignupPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      
      <div className="z-10 w-full max-w-sm">
        <Link href="/" className="inline-block mb-8 hover:opacity-80 transition-opacity">
          <BrandLogo className="text-2xl font-bold tracking-tight" />
        </Link>
        <SignupForm />
      </div>

      <Link href="/" className="z-10 text-sm text-blue-300/60 hover:text-cyan-400 transition-colors underline-offset-4 hover:underline">
        ← Back to home
      </Link>
    </main>
  );
}
