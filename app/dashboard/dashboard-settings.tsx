"use client";

import {
  formatTimezoneDisplay,
  getBrowserLocale,
  getBrowserTimeZone,
  isValidIanaTimeZone,
  type TimezoneSource,
} from "@/lib/location/timezone";
import { useCallback, useEffect, useState } from "react";

type Props = {
  initialTimeZone: string;
  initialTimezoneSource: TimezoneSource;
  initialCity: string | null;
  initialCountryCode: string | null;
  initialTelegramChatId: string | null;
  onTimeZoneChange: (timeZone: string, source: TimezoneSource) => void;
  onTelegramChange: (chatId: string | null) => void;
};

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export function DashboardSettings({
  initialTimeZone,
  initialTimezoneSource,
  initialCity,
  initialCountryCode,
  initialTelegramChatId,
  onTimeZoneChange,
  onTelegramChange,
}: Props) {
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [timezoneSource, setTimezoneSource] = useState(initialTimezoneSource);
  const [city, setCity] = useState(initialCity ?? "");
  const [countryCode, setCountryCode] = useState(initialCountryCode ?? "");
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [telegramId, setTelegramId] = useState(initialTelegramChatId ?? "");
  const [telegramMsg, setTelegramMsg] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [awaitingTelegramTap, setAwaitingTelegramTap] = useState(false);

  useEffect(() => {
    setTelegramId(initialTelegramChatId ?? "");
  }, [initialTelegramChatId]);

  useEffect(() => {
    if (!awaitingTelegramTap) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/telegram/status", { cache: "no-store" });
        const data = await parseJson<{ connected?: boolean; chat_id?: string | null }>(res);
        if (cancelled || !data.connected || !data.chat_id) return;
        setTelegramId(data.chat_id);
        onTelegramChange(data.chat_id);
        setAwaitingTelegramTap(false);
        setLinkUrl(null);
        setTelegramMsg("Telegram connected! You'll get task reminders here.");
      } catch {
        // keep polling
      }
    };

    void poll();
    const intervalId = window.setInterval(() => void poll(), 2000);
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setAwaitingTelegramTap(false);
        setTelegramMsg((prev) =>
          prev?.includes("Waiting")
            ? "Still waiting — open Telegram, tap Start on the bot, or paste your chat ID below."
            : prev,
        );
      }
    }, 120_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [awaitingTelegramTap, onTelegramChange]);

  const persistLocation = useCallback(
    async (patch: {
      timezone?: string;
      timezone_source?: TimezoneSource;
      city?: string | null;
      country_code?: string | null;
      locale?: string | null;
    }) => {
      const res = await fetch("/api/profile/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await parseJson<{ error?: string; profile?: { timezone: string } }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save location settings.");
      }
      if (patch.timezone) {
        setTimeZone(patch.timezone);
        onTimeZoneChange(patch.timezone, patch.timezone_source ?? timezoneSource);
      }
      if (patch.timezone_source !== undefined) {
        setTimezoneSource(patch.timezone_source);
      }
      return data;
    },
    [onTimeZoneChange, timezoneSource],
  );

  async function saveManualTimezone(event: React.FormEvent) {
    event.preventDefault();
    setLocationMsg(null);
    setLocationLoading(true);
    try {
      const tz = timeZone.trim();
      if (!isValidIanaTimeZone(tz)) {
        setLocationMsg("Enter a valid IANA timezone (e.g. Europe/London).");
        return;
      }
      await persistLocation({
        timezone: tz,
        timezone_source: "manual",
        city: city.trim() || null,
        country_code: countryCode.trim().toUpperCase() || null,
        locale: getBrowserLocale(),
      });
      setTimezoneSource("manual");
      setLocationMsg("Timezone saved.");
    } catch (e) {
      setLocationMsg(e instanceof Error ? e.message : "Failed to save timezone.");
    } finally {
      setLocationLoading(false);
    }
  }

  async function detectBrowserTimezone() {
    setLocationMsg(null);
    setLocationLoading(true);
    try {
      const browserTz = getBrowserTimeZone();
      if (!browserTz) {
        setLocationMsg("Could not read timezone from this browser.");
        return;
      }
      await persistLocation({
        timezone: browserTz,
        timezone_source: "browser",
        locale: getBrowserLocale(),
      });
      setTimeZone(browserTz);
      setTimezoneSource("browser");
      setLocationMsg(`Using device timezone: ${formatTimezoneDisplay(browserTz)}`);
    } catch (e) {
      setLocationMsg(e instanceof Error ? e.message : "Detection failed.");
    } finally {
      setLocationLoading(false);
    }
  }

  async function detectFromGeolocation() {
    setLocationMsg(null);
    if (!navigator.geolocation) {
      setLocationMsg("Geolocation is not supported in this browser.");
      return;
    }
    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12_000,
          maximumAge: 300_000,
        });
      });
      const { latitude, longitude } = position.coords;
      const res = await fetch(
        `/api/profile/detect-timezone?lat=${latitude}&lon=${longitude}`,
      );
      const data = await parseJson<{
        error?: string;
        timezone?: string;
        city?: string | null;
        country_code?: string | null;
      }>(res);
      if (!res.ok || !data.timezone) {
        throw new Error(data.error ?? "Could not resolve timezone from location.");
      }
      await persistLocation({
        timezone: data.timezone,
        timezone_source: "geolocation",
        city: data.city ?? (city.trim() || null),
        country_code: data.country_code ?? (countryCode.trim().toUpperCase() || null),
        locale: getBrowserLocale(),
      });
      setTimeZone(data.timezone);
      setTimezoneSource("geolocation");
      if (data.city) setCity(data.city);
      if (data.country_code) setCountryCode(data.country_code);
      setLocationMsg(
        `Location used for timezone only: ${formatTimezoneDisplay(data.timezone)}`,
      );
    } catch (e) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as GeolocationPositionError).code === (e as GeolocationPositionError).PERMISSION_DENIED
      ) {
        setLocationMsg("Location permission denied. Use browser timezone or enter manually.");
      } else {
        setLocationMsg(e instanceof Error ? e.message : "Location detection failed.");
      }
    } finally {
      setLocationLoading(false);
    }
  }

  async function detectFromIp() {
    setLocationMsg(null);
    setLocationLoading(true);
    try {
      const res = await fetch("/api/profile/detect-timezone");
      const data = await parseJson<{
        error?: string;
        timezone?: string;
        city?: string | null;
        country_code?: string | null;
        approximate?: boolean;
      }>(res);
      if (!res.ok || !data.timezone) {
        throw new Error(data.error ?? "IP timezone lookup failed.");
      }
      await persistLocation({
        timezone: data.timezone,
        timezone_source: "ip",
        city: data.city ?? (city.trim() || null),
        country_code: data.country_code ?? (countryCode.trim().toUpperCase() || null),
        locale: getBrowserLocale(),
      });
      setTimeZone(data.timezone);
      setTimezoneSource("ip");
      if (data.city) setCity(data.city);
      if (data.country_code) setCountryCode(data.country_code);
      setLocationMsg(
        `Approximate timezone from network: ${formatTimezoneDisplay(data.timezone)}`,
      );
    } catch (e) {
      setLocationMsg(e instanceof Error ? e.message : "IP detection failed.");
    } finally {
      setLocationLoading(false);
    }
  }

  async function startTelegramLink() {
    setTelegramMsg(null);
    setTelegramLoading(true);
    setLinkUrl(null);
    setAwaitingTelegramTap(false);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await parseJson<{
        error?: string;
        url?: string;
        webhook_registered?: boolean;
        webhook_skipped?: boolean;
        webhook_hint?: string | null;
      }>(res);
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not create Telegram link.");
      }
      setLinkUrl(data.url);
      setAwaitingTelegramTap(true);
      if (data.webhook_skipped) {
        setTelegramMsg(
          "On localhost, one-tap link opens Telegram but won't auto-connect — paste chat ID below after messaging the bot.",
        );
      } else if (data.webhook_registered) {
        setTelegramMsg("Tap the button below → Telegram opens → tap Start. This page updates automatically.");
      } else if (data.webhook_hint) {
        setTelegramMsg(data.webhook_hint);
      } else {
        setTelegramMsg("Open Telegram and tap Start on the bot.");
      }
    } catch (e) {
      setTelegramMsg(e instanceof Error ? e.message : "Telegram connect failed.");
    } finally {
      setTelegramLoading(false);
    }
  }

  async function saveTelegramManual(event: React.FormEvent) {
    event.preventDefault();
    setTelegramMsg(null);
    setTelegramLoading(true);
    try {
      const trimmed = telegramId.trim();
      if (trimmed && !/^\d+$/.test(trimmed)) {
        setTelegramMsg("Chat ID must be a number.");
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTelegramMsg("Session expired. Please sign in again.");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: trimmed.length ? trimmed : null })
        .eq("id", user.id);
      if (error) {
        throw new Error(error.message);
      }
      onTelegramChange(trimmed.length ? trimmed : null);
      setTelegramMsg(trimmed.length ? "Telegram connected." : "Telegram disconnected.");
      setLinkUrl(null);
    } catch (e) {
      setTelegramMsg(e instanceof Error ? e.message : "Failed to save chat ID.");
    } finally {
      setTelegramLoading(false);
    }
  }

  async function disconnectTelegram() {
    setTelegramLoading(true);
    setTelegramMsg(null);
    try {
      const res = await fetch("/api/telegram/link", { method: "DELETE" });
      const data = await parseJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Disconnect failed.");
      }
      setTelegramId("");
      onTelegramChange(null);
      setLinkUrl(null);
      setTelegramMsg("Telegram disconnected.");
    } catch (e) {
      setTelegramMsg(e instanceof Error ? e.message : "Disconnect failed.");
    } finally {
      setTelegramLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-1">
      <section>
        <h3 className="text-sm font-semibold text-blue-100 mb-1">Time &amp; location</h3>
        <p className="text-[11px] text-blue-200/50 mb-3 leading-relaxed">
          Used for schedule times, reminders, and the date in your header. We only store what
          you choose here — location is optional and never required to use the app.
        </p>
        <form onSubmit={saveManualTimezone} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-blue-100">Timezone (IANA)</span>
            <input
              type="text"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              placeholder="e.g. America/New_York"
              className="rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-blue-300/30 outline-none ring-cyan-400/50 focus:border-cyan-400 focus:ring-2 transition-all"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-blue-200/70">City (optional)</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-lg border border-blue-900/50 bg-slate-950/50 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-blue-200/70">Country (optional)</span>
              <input
                type="text"
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                placeholder="US"
                className="rounded-lg border border-blue-900/50 bg-slate-950/50 px-3 py-2 text-sm text-white uppercase"
              />
            </label>
          </div>
          <p className="text-xs text-blue-300/70 leading-snug break-words">
            Source: {timezoneSource ?? "auto"} · {formatTimezoneDisplay(timeZone)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void detectBrowserTimezone()}
              disabled={locationLoading}
              className="min-h-10 touch-manipulation rounded-lg border border-blue-900/50 px-3 py-2.5 text-left text-xs font-medium text-blue-100 hover:bg-slate-800 disabled:opacity-50 sm:text-center"
            >
              Use device timezone
            </button>
            <button
              type="button"
              onClick={() => void detectFromGeolocation()}
              disabled={locationLoading}
              className="min-h-10 touch-manipulation rounded-lg border border-blue-900/50 px-3 py-2.5 text-left text-xs font-medium text-blue-100 hover:bg-slate-800 disabled:opacity-50 sm:text-center"
            >
              Use my location
            </button>
            <button
              type="button"
              onClick={() => void detectFromIp()}
              disabled={locationLoading}
              className="min-h-10 touch-manipulation rounded-lg border border-blue-900/50 px-3 py-2.5 text-left text-xs font-medium text-blue-100 hover:bg-slate-800 disabled:opacity-50 sm:text-center"
            >
              Approximate (IP)
            </button>
          </div>
          <button
            type="submit"
            disabled={locationLoading}
            className="rounded-xl bg-slate-800 border border-blue-900/50 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {locationLoading ? "Saving…" : "Save timezone"}
          </button>
          {locationMsg && (
            <p
              className={`text-xs ${locationMsg.includes("failed") || locationMsg.includes("denied") || locationMsg.includes("valid") ? "text-red-400" : "text-cyan-400"}`}
            >
              {locationMsg}
            </p>
          )}
        </form>
      </section>

      <section className="border-t border-blue-900/30 pt-5">
        <h3 className="text-sm font-semibold text-blue-100 mb-1">Telegram reminders</h3>
        <p className="text-[11px] text-blue-200/50 mb-3 leading-relaxed">
          Get a message ~15 minutes before each task. Connect with one tap, or paste a chat ID
          from @userinfobot if the bot link is unavailable.
        </p>
        <div className="flex flex-col gap-3">
          {telegramId.trim() ? (
            <p className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-200">
              Connected · chat ID ending …{telegramId.slice(-4)}
            </p>
          ) : null}

          {!linkUrl ? (
            <button
              type="button"
              onClick={() => void startTelegramLink()}
              disabled={telegramLoading}
              className="min-h-12 touch-manipulation rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {telegramLoading ? "Preparing link…" : "Connect Telegram (one tap)"}
            </button>
          ) : (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all"
            >
              Open @{linkUrl.split("/").pop()?.split("?")[0] ?? "bot"} &amp; tap Start
            </a>
          )}

          {awaitingTelegramTap && (
            <p className="text-xs text-blue-200/70 animate-pulse">
              Waiting for you to tap Start in Telegram…
            </p>
          )}

          {linkUrl && (
            <button
              type="button"
              onClick={() => void startTelegramLink()}
              disabled={telegramLoading}
              className="text-xs text-blue-300/60 hover:text-cyan-400"
            >
              Generate a new link
            </button>
          )}
          {telegramId.trim() && (
            <button
              type="button"
              onClick={() => void disconnectTelegram()}
              disabled={telegramLoading}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              Disconnect Telegram
            </button>
          )}
          <form onSubmit={saveTelegramManual} className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-blue-100">Or enter Chat ID manually</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 123456789"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ""))}
                className="rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-blue-300/30 outline-none ring-cyan-400/50 focus:border-cyan-400 focus:ring-2"
              />
            </label>
            <button
              type="submit"
              disabled={telegramLoading}
              className="rounded-xl border border-blue-900/50 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-slate-800 disabled:opacity-50"
            >
              Save chat ID
            </button>
          </form>
          {telegramMsg && (
            <p
              role="alert"
              className={`text-sm leading-relaxed break-words ${
                /Missing TELEGRAM|failed|must|Could not|not configured|invalid|expired|denied|Check TELEGRAM|Vercel/i.test(
                  telegramMsg,
                )
                  ? "text-red-300"
                  : "text-cyan-400"
              }`}
            >
              {telegramMsg}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
