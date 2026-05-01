import { createClient } from "@/lib/supabase/server";
import { isValidScheduleDate } from "@/lib/dashboard/date-selection";
import { getTodayDateStringInTimeZone } from "@/lib/date";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

type DashboardPageProps = {
  searchParams?: Promise<{ date?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, timezone, telegram_chat_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login?next=/dashboard");
  }

  const timeZone = profile.timezone?.trim() || "UTC";
  const todayDate = getTodayDateStringInTimeZone(timeZone);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawDate = resolvedSearchParams?.date;
  const selectedDate =
    typeof rawDate === "string" && isValidScheduleDate(rawDate) ? rawDate : todayDate;

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      profileName={profile.full_name}
      timeZone={timeZone}
      todayDate={todayDate}
      initialSelectedDate={selectedDate}
      initialTelegramChatId={profile.telegram_chat_id}
    />
  );
}
