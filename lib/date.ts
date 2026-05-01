/** Calendar date YYYY-MM-DD for “today” in an IANA timezone. */
export function getTodayDateStringInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Dashboard calendar-day selection should match the user's real day.
 * If the profile timezone is missing or left as UTC (common default), fall back to the
 * browser's IANA timezone for *date picking only* (times still use profile TZ elsewhere).
 */
export function getDashboardCalendarTimeZone(profileTimeZone: string): {
  calendarTimeZone: string;
  usesBrowserFallback: boolean;
} {
  const trimmed = profileTimeZone.trim();
  if (!trimmed || trimmed.toUpperCase() === "UTC") {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTz) {
        return { calendarTimeZone: browserTz, usesBrowserFallback: true };
      }
    } catch {
      // ignore
    }
    return { calendarTimeZone: "UTC", usesBrowserFallback: false };
  }
  return { calendarTimeZone: trimmed, usesBrowserFallback: false };
}

/**
 * Weekday 0=Sunday..6=Saturday for a YYYY-MM-DD interpreted as that calendar date in TZ.
 * Uses UTC noon for the calendar day to reduce boundary skew when formatting in `timeZone`.
 */
export function getWeekdayInTimeZone(dateStr: string, timeZone: string): number {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(utcNoon);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return dayMap[dayName] ?? 0;
}

export function formatTimeInTimeZone(
  iso: string,
  timeZone: string,
): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Add whole-day offset to YYYY-MM-DD using UTC-safe arithmetic. */
export function addDaysToDateString(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
