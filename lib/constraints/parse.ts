import type { FixedClassSlot, LifeVariables } from "./types";
import { defaultLifeVariables } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseFixedSchedule(raw: unknown): FixedClassSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: FixedClassSlot[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === "string" ? item.name : "";
    const type = typeof item.type === "string" ? item.type : "Class";
    const location = typeof item.location === "string" ? item.location : "";
    const starts_at =
      typeof item.starts_at === "string" ? normalizeTime(item.starts_at) : "09:00";
    const ends_at =
      typeof item.ends_at === "string" ? normalizeTime(item.ends_at) : "10:00";
    const days = Array.isArray(item.days)
      ? item.days
          .filter((value): value is number => typeof value === "number")
          .filter((value) => value >= 0 && value <= 6)
      : [];
    out.push({ name, type, location, starts_at, ends_at, days });
  }
  return out;
}

export function parseLifeVariables(raw: unknown): LifeVariables {
  const d = defaultLifeVariables();
  if (!isRecord(raw)) return d;
  const safeTimeOr = (value: unknown, fallback: string | null): string | null => {
    if (typeof value !== "string") return fallback;
    const normalized = normalizeTime(value);
    return /^\d{2}:\d{2}$/.test(normalized) ? normalized : fallback;
  };
  const safeNumberOr = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;
  const safeStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  const safeDaysArray = (value: unknown): number[] =>
    Array.isArray(value)
      ? value
          .filter((v): v is number => typeof v === "number")
          .filter((v) => v >= 0 && v <= 6)
      : [];

  return {
    wake_up_time: safeTimeOr(raw.wake_up_time, d.wake_up_time) ?? d.wake_up_time,
    hygiene_duration_minutes: safeNumberOr(
      raw.hygiene_duration_minutes,
      d.hygiene_duration_minutes,
    ),
    eats_breakfast_at_home:
      typeof raw.eats_breakfast_at_home === "boolean"
        ? raw.eats_breakfast_at_home
        : d.eats_breakfast_at_home,
    breakfast_duration_minutes: safeNumberOr(
      raw.breakfast_duration_minutes,
      d.breakfast_duration_minutes,
    ),
    breakfast_time: safeTimeOr(raw.breakfast_time, d.breakfast_time),
    locations: Array.isArray(raw.locations)
      ? raw.locations
          .filter(isRecord)
          .map((loc) => ({
            name: typeof loc.name === "string" ? loc.name : "",
            travel_minutes_from_home: safeNumberOr(loc.travel_minutes_from_home, 0),
          }))
      : d.locations,
    transport_types: safeStringArray(raw.transport_types),
    transport_wait_minutes: safeNumberOr(raw.transport_wait_minutes, d.transport_wait_minutes),
    lunch_time: safeTimeOr(raw.lunch_time, d.lunch_time) ?? d.lunch_time,
    lunch_location: typeof raw.lunch_location === "string" ? raw.lunch_location : d.lunch_location,
    dinner_time: safeTimeOr(raw.dinner_time, d.dinner_time) ?? d.dinner_time,
    dinner_prep: typeof raw.dinner_prep === "string" ? raw.dinner_prep : d.dinner_prep,
    trains: typeof raw.trains === "boolean" ? raw.trains : d.trains,
    training_types: safeStringArray(raw.training_types),
    training_days: safeDaysArray(raw.training_days),
    training_start_time: safeTimeOr(raw.training_start_time, d.training_start_time),
    training_duration_minutes: safeNumberOr(
      raw.training_duration_minutes,
      d.training_duration_minutes,
    ),
    travel_to_training:
      isRecord(raw.travel_to_training) &&
      ("from_home" in raw.travel_to_training || "from_university" in raw.travel_to_training)
        ? {
            from_home:
              typeof raw.travel_to_training.from_home === "number"
                ? Math.max(0, raw.travel_to_training.from_home)
                : null,
            from_university:
              typeof raw.travel_to_training.from_university === "number"
                ? Math.max(0, raw.travel_to_training.from_university)
                : null,
          }
        : d.travel_to_training,
    sleep_time: safeTimeOr(raw.sleep_time, d.sleep_time) ?? d.sleep_time,
    sleep_hours: safeNumberOr(raw.sleep_hours, d.sleep_hours),
    focus_span_minutes: safeNumberOr(raw.focus_span_minutes, d.focus_span_minutes),
    study_time_preference:
      typeof raw.study_time_preference === "string"
        ? raw.study_time_preference
        : d.study_time_preference,
    study_locations: safeStringArray(raw.study_locations),
    study_sessions_target: safeNumberOr(raw.study_sessions_target, d.study_sessions_target),
    assignment_sessions_target: safeNumberOr(
      raw.assignment_sessions_target,
      d.assignment_sessions_target,
    ),
    session_interval_targets:
      isRecord(raw.session_interval_targets)
        ? {
            morning_9_12: safeNumberOr(
              raw.session_interval_targets.morning_9_12,
              d.session_interval_targets.morning_9_12,
            ),
            afternoon_12_17: safeNumberOr(
              raw.session_interval_targets.afternoon_12_17,
              d.session_interval_targets.afternoon_12_17,
            ),
            evening_17_22: safeNumberOr(
              raw.session_interval_targets.evening_17_22,
              d.session_interval_targets.evening_17_22,
            ),
          }
        : d.session_interval_targets,
    hard_start_time: safeTimeOr(raw.hard_start_time, d.hard_start_time),
    hard_stop_time: safeTimeOr(raw.hard_stop_time, d.hard_stop_time),
    auto_breaks: typeof raw.auto_breaks === "boolean" ? raw.auto_breaks : d.auto_breaks,
    meal_reminders:
      typeof raw.meal_reminders === "boolean" ? raw.meal_reminders : d.meal_reminders,
    recurring_commitments: Array.isArray(raw.recurring_commitments)
      ? raw.recurring_commitments.filter(isRecord).map((item) => ({
          name: typeof item.name === "string" ? item.name : "",
          days: safeDaysArray(item.days),
          starts_at: safeTimeOr(item.starts_at, "09:00") ?? "09:00",
          duration_minutes: safeNumberOr(item.duration_minutes, 30),
          location: typeof item.location === "string" ? item.location : null,
        }))
      : [],
    job:
      isRecord(raw.job) &&
      typeof raw.job.workplace_name === "string" &&
      typeof raw.job.shift_start === "string" &&
      typeof raw.job.shift_end === "string"
        ? {
            workplace_name: raw.job.workplace_name,
            working_days: safeDaysArray(raw.job.working_days),
            shift_start: safeTimeOr(raw.job.shift_start, "09:00") ?? "09:00",
            shift_end: safeTimeOr(raw.job.shift_end, "17:00") ?? "17:00",
            travel_minutes_from_home: safeNumberOr(raw.job.travel_minutes_from_home, 0),
          }
        : null,
    social_plans: Array.isArray(raw.social_plans)
      ? raw.social_plans.filter(isRecord).map((item) => ({
          what: typeof item.what === "string" ? item.what : "",
          days: safeDaysArray(item.days),
          starts_at: safeTimeOr(item.starts_at, "18:00") ?? "18:00",
          duration_minutes: safeNumberOr(item.duration_minutes, 60),
          location:
            item.location === "At home" ||
            item.location === "Outside" ||
            item.location === "Online or Call"
              ? item.location
              : "Outside",
        }))
      : [],
  };
}

export function normalizeTime(value: string): string {
  const v = value.trim();
  if (/^\d{1,2}:\d{2}$/.test(v)) {
    const [h, m] = v.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(v)) {
    return v.slice(0, 5);
  }
  return v;
}

/** Strip empty class rows; normalize times. */
export function sanitizeFixedSchedule(rows: FixedClassSlot[]): FixedClassSlot[] {
  return rows
    .filter((r) => r.name.trim().length > 0)
    .map((r) => ({
      name: r.name.trim(),
      type: r.type.trim() || "Class",
      location: r.location.trim(),
      starts_at: normalizeTime(r.starts_at),
      ends_at: normalizeTime(r.ends_at),
      days: r.days.filter((day) => day >= 0 && day <= 6),
    }));
}

export function initialRowsFromDb(raw: unknown): FixedClassSlot[] {
  return parseFixedSchedule(raw);
}
