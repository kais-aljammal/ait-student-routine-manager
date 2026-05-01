// Fetches or deletes routine tasks for an authenticated user's selected date.
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function parseScheduleDate(input: string | null): string | null {
  if (!input) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scheduleDate = parseScheduleDate(url.searchParams.get("schedule_date"));
  if (!scheduleDate) {
    return NextResponse.json(
      { error: "schedule_date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, category, starts_at, ends_at, schedule_date, completed")
    .eq("user_id", user.id)
    .eq("schedule_date", scheduleDate)
    .order("starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tasks: data ?? [] });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scheduleDate = parseScheduleDate(url.searchParams.get("schedule_date"));
  if (!scheduleDate) {
    return NextResponse.json(
      { error: "schedule_date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", user.id)
    .eq("schedule_date", scheduleDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
