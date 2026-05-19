import { normalizeTimestamp } from "@/lib/schedule/timestamp";

export type TaskCategory = "class" | "study" | "life";

export type GeneratedTaskInput = {
  title: string;
  category: TaskCategory;
  starts_at: string;
  ends_at: string;
  schedule_date: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function extractJsonArrayFromModelText(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1]?.trim() ?? trimmed;
  return JSON.parse(raw);
}

function isCategory(v: unknown): v is TaskCategory {
  return v === "class" || v === "study" || v === "life";
}

function normalizeCategory(v: unknown): TaskCategory {
  if (typeof v !== "string") return "life";
  const value = v.toLowerCase().trim();
  if (isCategory(value)) return value;
  if (["lecture", "lab", "class", "lesson"].includes(value)) {
    return "class";
  }
  if (["study", "review", "homework", "revision"].includes(value)) {
    return "study";
  }
  if (["break", "rest", "free time", "personal"].includes(value)) {
    return "life";
  }
  return "life";
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

function normalizeScheduleDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const raw = v.trim();
  if (!raw) return null;
  if (dateRe.test(raw)) return raw;
  if (raw.includes("T") || raw.includes(" ")) {
    const datePart = raw.split(/[T ]/)[0]?.trim();
    if (datePart && dateRe.test(datePart)) return datePart;
  }
  return null;
}

export function parseAndValidateGeneratedTasks(
  raw: unknown,
  expectedScheduleDate: string,
  timezone: string,
): GeneratedTaskInput[] {
  if (!Array.isArray(raw)) {
    throw new Error("Model output is not a JSON array");
  }
  const out: GeneratedTaskInput[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const title = item.title;
    const category = normalizeCategory(item.category);
    const starts_at = item.starts_at;
    const ends_at = item.ends_at;
    const schedule_date = normalizeScheduleDate(item.schedule_date) ?? expectedScheduleDate;
    if (typeof title !== "string" || title.trim().length === 0) {
      throw new Error("Each task must have a non-empty title string");
    }
    if (typeof starts_at !== "string" || typeof ends_at !== "string") {
      throw new Error("starts_at and ends_at must be ISO 8601 strings");
    }
    const normalizedStart = normalizeTimestamp(
      starts_at,
      expectedScheduleDate,
      timezone,
    );
    const normalizedEnd = normalizeTimestamp(
      ends_at,
      expectedScheduleDate,
      timezone,
    );
    if (!normalizedStart || !normalizedEnd) {
      throw new Error("Invalid ISO timestamps in task");
    }
    const startMs = Date.parse(normalizedStart);
    const endMs = Date.parse(normalizedEnd);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      throw new Error("Invalid ISO timestamps in task");
    }
    if (startMs >= endMs) {
      throw new Error(`Task "${title}" ends_at must be after starts_at`);
    }
    if (schedule_date !== expectedScheduleDate) {
      throw new Error(
        `All tasks must use schedule_date "${expectedScheduleDate}", got "${schedule_date}"`,
      );
    }
    out.push({
      title: title.trim(),
      category,
      starts_at: normalizedStart,
      ends_at: normalizedEnd,
      schedule_date,
    });
  }
  if (out.length === 0) {
    throw new Error("No valid tasks in model output");
  }
  out.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  for (let i = 0; i < out.length - 1; i++) {
    const curEnd = Date.parse(out[i]!.ends_at);
    const nextStart = Date.parse(out[i + 1]!.starts_at);
    if (curEnd > nextStart) {
      throw new Error(
        `Overlapping tasks: "${out[i]!.title}" ends after "${out[i + 1]!.title}" starts`,
      );
    }
  }
  return out;
}

export function sanitizeGeneratedTasks(
  raw: unknown,
  expectedScheduleDate: string,
): unknown {
  if (!Array.isArray(raw)) return raw;
  return raw.map((item) => {
    if (!isRecord(item)) return item;
    const category = normalizeCategory(item.category);
    const rawTitle = typeof item.title === "string" ? item.title.trim() : "";
    const title =
      rawTitle.length > 0
        ? rawTitle
        : category === "study"
          ? "Study Session"
          : category === "class"
            ? "Class"
            : "Free Time";
    const schedule_date =
      normalizeScheduleDate(item.schedule_date) ?? expectedScheduleDate;
    return {
      ...item,
      category,
      title,
      schedule_date,
    };
  });
}
