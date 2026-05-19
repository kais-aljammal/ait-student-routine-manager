const TG_API = "https://api.telegram.org";

let cachedBotUsername: string | null = null;

/** Resolve @handle for deep links — env first, else Telegram getMe (cached). */
export async function getTelegramBotUsername(): Promise<string | null> {
  const fromEnv = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (fromEnv) return fromEnv;

  if (cachedBotUsername) return cachedBotUsername;

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;

  const res = await fetch(`${TG_API}/bot${token}/getMe`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    ok?: boolean;
    result?: { username?: string };
  };
  const username = data.result?.username?.trim();
  if (username) {
    cachedBotUsername = username;
    return username;
  }
  return null;
}

function getAppBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!raw) return null;
  return raw;
}

export function isPublicAppUrl(appUrl: string): boolean {
  try {
    const u = new URL(appUrl);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
}

/** Point Telegram at our webhook (required for one-tap Connect). Best-effort. */
export async function registerTelegramWebhook(): Promise<{
  ok: boolean;
  webhookUrl?: string;
  skipped?: boolean;
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const appUrl = getAppBaseUrl();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set" };
  }
  if (!appUrl) {
    return { ok: false, error: "NEXT_PUBLIC_APP_URL is not set" };
  }
  if (!isPublicAppUrl(appUrl)) {
    return {
      ok: false,
      skipped: true,
      error: "Webhook cannot reach localhost — use production URL or paste chat ID manually.",
    };
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const payload: { url: string; secret_token?: string } = { url: webhookUrl };
  if (secret) payload.secret_token = secret;

  const res = await fetch(`${TG_API}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.description ?? `setWebhook failed (${res.status})`,
    };
  }
  return { ok: true, webhookUrl };
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  const url = `${TG_API}/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}
