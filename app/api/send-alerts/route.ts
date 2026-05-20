import { serverErrorResponse } from "@/lib/api/safe-error";
import { formatTimeInTimeZone } from "@/lib/date";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "Telegram bot token not configured" },
      { status: 500 },
    );
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "Server misconfigured (Supabase service role)" },
      { status: 500 },
    );
  }
  const now = new Date();
  const in15 = new Date(now.getTime() + 15 * 60 * 1000);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, user_id, title, starts_at, alert_sent_at")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in15.toISOString())
    .is("alert_sent_at", null)
    .eq("completed", false);

  if (tasksError) {
    return serverErrorResponse("send-alerts", "TASKS_QUERY_FAILED", tasksError);
  }

  const list = tasks ?? [];
  if (list.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const userIds = [...new Set(list.map((t) => t.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, telegram_chat_id, timezone")
    .in("id", userIds)
    .not("telegram_chat_id", "is", null);

  if (profilesError) {
    return serverErrorResponse("send-alerts", "PROFILES_QUERY_FAILED", profilesError);
  }

  const chatByUser = new Map<string, { chatId: string; timeZone: string }>();
  for (const p of profiles ?? []) {
    const raw = p.telegram_chat_id?.trim();
    if (raw) {
      chatByUser.set(p.id, {
        chatId: raw,
        timeZone: p.timezone?.trim() || "UTC",
      });
    }
  }

  let sent = 0;
  const errors: string[] = [];

  for (const task of list) {
    const linked = chatByUser.get(task.user_id);
    if (!linked) continue;

    try {
      const localTime = formatTimeInTimeZone(task.starts_at, linked.timeZone);
      await sendTelegramMessage(
        linked.chatId,
        `Reminder: "${task.title}" starts at ${localTime} (in about 15 minutes).`,
      );
      const { error: upErr } = await supabase
        .from("tasks")
        .update({ alert_sent_at: new Date().toISOString() })
        .eq("id", task.id);
      if (upErr) {
        errors.push(`${task.id}: ${upErr.message}`);
        continue;
      }
      sent += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        JSON.stringify({
          route: "send-alerts",
          errorCode: "TELEGRAM_SEND_FAILED",
          taskId: task.id,
          userId: task.user_id,
          message: msg,
        }),
      );
      errors.push(`${task.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    sent,
    candidates: list.length,
    errors: errors.length ? errors : undefined,
  });
}

export const POST = GET;
