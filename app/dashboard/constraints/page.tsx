import { createClient } from "@/lib/supabase/server";
import { isValidScheduleDate } from "@/lib/dashboard/date-selection";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./onboarding-flow";

type ConstraintsPageProps = {
  searchParams?: Promise<{ date?: string | string[] }>;
};

export default async function ConstraintsPage({ searchParams }: ConstraintsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawDate = resolvedSearchParams?.date;
  const selectedDate =
    typeof rawDate === "string" && isValidScheduleDate(rawDate) ? rawDate : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="z-10 w-full max-w-md">
        <OnboardingFlow selectedDate={selectedDate} />
      </div>
    </main>
  );
}
