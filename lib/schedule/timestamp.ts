import { fromZonedTime } from "date-fns-tz";

const timeOnlyRe = /^\d{2}:\d{2}(?::\d{2})?$/;

function hasTimezoneOffset(isoCandidate: string): boolean {
  return (
    isoCandidate.endsWith("Z") ||
    isoCandidate.includes("+") ||
    /\d{2}:\d{2}:\d{2}-/.test(isoCandidate)
  );
}

/**
 * Normalizes AI task timestamps to UTC ISO strings.
 * HH:MM (no offset) is interpreted as wall time in `timezone`.
 */
export function normalizeTimestamp(
  raw: string,
  scheduleDate: string,
  timezone: string,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const tz = timezone?.trim() || "UTC";
  if (!timezone?.trim()) {
    console.warn(
      "[normalizeTimestamp] Missing timezone; falling back to UTC for time-only value",
      { scheduleDate, raw: trimmed },
    );
  }

  if (timeOnlyRe.test(trimmed)) {
    const timePart = trimmed.length === 5 ? `${trimmed}:00` : trimmed;
    const localDatetime = `${scheduleDate}T${timePart}`;
    try {
      return fromZonedTime(localDatetime, tz).toISOString();
    } catch {
      return null;
    }
  }

  let isoCandidate = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  if (!hasTimezoneOffset(isoCandidate)) {
    try {
      return fromZonedTime(isoCandidate, tz).toISOString();
    } catch {
      const parsed = Date.parse(`${isoCandidate}Z`);
      return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
    }
  }

  const parsed = Date.parse(isoCandidate);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
