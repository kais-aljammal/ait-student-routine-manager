export type TimezoneSource =
  | "manual"
  | "browser"
  | "geolocation"
  | "ip"
  | "signup"
  | null;

export function isValidIanaTimeZone(value: string | null | undefined): value is string {
  if (!value || !value.trim() || value.length > 64) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value.trim() }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getBrowserTimeZone(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidIanaTimeZone(tz) ? tz : null;
  } catch {
    return null;
  }
}

export function getBrowserLocale(): string | null {
  if (typeof navigator === "undefined") return null;
  const locale = navigator.language?.trim();
  return locale || null;
}

/**
 * Resolution order for display + scheduling when not overridden in Settings:
 * 1. manual profile timezone
 * 2. browser IANA timezone
 * 3. profile timezone (legacy auto-detected, e.g. stale Asia/Riyadh)
 * 4. UTC
 */
export function resolveEffectiveTimeZone(input: {
  profileTimeZone: string | null | undefined;
  timezoneSource: TimezoneSource;
}): {
  timeZone: string;
  source: Exclude<TimezoneSource, null> | "fallback";
  shouldAutoPersist: boolean;
} {
  const profileTz = input.profileTimeZone?.trim() ?? "";
  const browserTz = getBrowserTimeZone();

  if (input.timezoneSource === "manual" && isValidIanaTimeZone(profileTz)) {
    return { timeZone: profileTz, source: "manual", shouldAutoPersist: false };
  }

  if (browserTz) {
    const shouldAutoPersist =
      input.timezoneSource !== "manual" && browserTz !== profileTz;
    return { timeZone: browserTz, source: "browser", shouldAutoPersist };
  }

  if (isValidIanaTimeZone(profileTz)) {
    return { timeZone: profileTz, source: "fallback", shouldAutoPersist: false };
  }

  return { timeZone: "UTC", source: "fallback", shouldAutoPersist: false };
}

export function formatTimezoneDisplay(
  timeZone: string,
  locale = "en-US",
): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const abbr = parts.find((p) => p.type === "timeZoneName")?.value;
    return abbr ? `${timeZone} (${abbr})` : timeZone;
  } catch {
    return timeZone;
  }
}
