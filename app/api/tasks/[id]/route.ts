// Updates completion state for a single user-owned task.
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };
type PatchTaskBody = { completed?: boolean };

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, user_id, completed")
    .eq("id", id)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PatchTaskBody;
  try {
    body = (await request.json()) as { completed?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const completed =
    typeof body.completed === "boolean" ? body.completed : task.completed;

  const { data: updated, error: updateError } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, category, starts_at, ends_at, schedule_date, completed")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, task: updated });
}
