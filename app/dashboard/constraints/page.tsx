import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/ensure-profile";
import { isValidScheduleDate } from "@/lib/dashboard/date-selection";
import { getTodayDateStringInTimeZone } from "@/lib/date";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./onboarding-flow";

type ConstraintsPageProps = {
  searchParams?: Promise<{ date?: string | string[]; edit?: string | string[] }>;
};

export default async function ConstraintsPage({ searchParams }: ConstraintsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const ensured = await ensureUserProfile(supabase, user);
  if (!ensured.profile) {
    redirect("/login?next=/dashboard");
  }

  const timeZone = ensured.profile.timezone?.trim() || "UTC";
  const todayDate = getTodayDateStringInTimeZone(timeZone);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawDate = resolvedSearchParams?.date;
  const initialScheduleDate =
    typeof rawDate === "string" && isValidScheduleDate(rawDate) ? rawDate : null;

  const rawEdit = resolvedSearchParams?.edit;
  const isEditMode = rawEdit === "1" || rawEdit === "true";

  if (isEditMode && !initialScheduleDate) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="z-10 w-full max-w-md">
        <OnboardingFlow
          initialScheduleDate={initialScheduleDate}
          todayDate={todayDate}
          timeZone={timeZone}
          isEditMode={isEditMode}
        />
      </div>
    </main>
  );
}
