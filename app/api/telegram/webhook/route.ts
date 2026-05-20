import { logRouteError, serverErrorResponse } from "@/lib/api/safe-error";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isPublicAppUrl, sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
};

function extractLinkToken(text: string | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  const match = trimmed.match(/^\/start(?:@\w+)?(?:\s+)link_([a-f0-9]{32})$/i);
  if (match?.[1]) return match[1];
  if (trimmed.startsWith("/start") && trimmed.includes("link_")) {
    const idx = trimmed.indexOf("link_");
    const candidate = trimmed.slice(idx + 5).trim();
    if (/^[a-f0-9]{32}$/i.test(candidate)) return candidate;
  }
  return null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const requiresSecret = Boolean(appUrl && isPublicAppUrl(appUrl));

  if (requiresSecret && !webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (webhookSecret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "Telegram bot token not configured" },
      { status: 500 },
    );
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const chatId = update.message?.chat?.id;
  const token = extractLinkToken(update.message?.text);

  if (!chatId || !token) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    return serverErrorResponse("telegram/webhook", "SUPABASE_MISCONFIGURED", e);
  }

  const nowIso = new Date().toISOString();
  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, telegram_link_expires_at")
    .eq("telegram_link_token", token)
    .maybeSingle();

  if (lookupError) {
    return serverErrorResponse("telegram/webhook", "LOOKUP_FAILED", lookupError);
  }

  if (!profile) {
    await sendTelegramMessage(
      String(chatId),
      "This link is invalid or already used. Open Routine.ai → Settings → Connect Telegram to get a new link.",
    ).catch(() => undefined);
    return NextResponse.json({ ok: true, linked: false });
  }

  const expires = profile.telegram_link_expires_at;
  if (expires && expires < nowIso) {
    await sendTelegramMessage(
      String(chatId),
      "This link expired. Open Routine.ai → Settings and tap Connect Telegram again.",
    ).catch(() => undefined);
    return NextResponse.json({ ok: true, linked: false, reason: "expired" });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      telegram_chat_id: String(chatId),
      telegram_link_token: null,
      telegram_link_expires_at: null,
    })
    .eq("id", profile.id);

  if (updateError) {
    return serverErrorResponse("telegram/webhook", "LINK_SAVE_FAILED", updateError, {
      userId: profile.id,
    });
  }

  console.info(
    JSON.stringify({
      route: "telegram/webhook",
      event: "telegram_linked",
      userId: profile.id,
      chatId,
    }),
  );

  await sendTelegramMessage(
    String(chatId),
    "You're connected to Routine.ai. You'll get reminders about 15 minutes before each task.",
  ).catch((e) => {
    console.error(
      JSON.stringify({
        route: "telegram/webhook",
        errorCode: "WELCOME_SEND_FAILED",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
  });

  return NextResponse.json({ ok: true, linked: true });
}
