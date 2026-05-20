import { createClient } from "@/lib/supabase/server";
import { getTelegramBotUsername, registerTelegramWebhook } from "@/lib/telegram";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const LINK_TTL_MS = 15 * 60 * 1000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken) {
    return NextResponse.json(
      {
        error:
          "Missing TELEGRAM_BOT_TOKEN. In Vercel: Project → Settings → Environment Variables → add TELEGRAM_BOT_TOKEN for Production, enable it for Production deploys only if needed → Save → Redeploy.",
      },
      { status: 503 },
    );
  }

  const botUsername = await getTelegramBotUsername();
  if (!botUsername) {
    return NextResponse.json(
      {
        error:
          "Could not resolve bot username. Check TELEGRAM_BOT_TOKEN or set TELEGRAM_BOT_USERNAME.",
      },
      { status: 503 },
    );
  }

  const webhook = await registerTelegramWebhook();
  if (!webhook.ok && !webhook.skipped) {
    console.error(
      JSON.stringify({
        route: "telegram/link",
        errorCode: "WEBHOOK_REGISTER_FAILED",
        message: webhook.error,
      }),
    );
  }

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      telegram_link_token: token,
      telegram_link_expires_at: expiresAt,
    })
    .eq("id", user.id);

  if (error) {
    console.error(
      JSON.stringify({
        route: "telegram/link",
        errorCode: "TOKEN_SAVE_FAILED",
        userId: user.id,
        message: error.message,
      }),
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    url: `https://t.me/${botUsername}?start=link_${token}`,
    expires_at: expiresAt,
    bot_username: botUsername,
    webhook_registered: webhook.ok,
    webhook_skipped: webhook.skipped ?? false,
    webhook_hint: webhook.ok
      ? null
      : webhook.error ?? "Webhook setup failed — one-tap connect may not complete.",
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      telegram_chat_id: null,
      telegram_link_token: null,
      telegram_link_expires_at: null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
