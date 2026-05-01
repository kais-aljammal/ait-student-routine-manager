import type { LifeVariables } from "@/lib/constraints/types";
import type { GeneratedTaskInput } from "./generated-task";
import { inferTaskKind, titleForKind } from "./task-kind";

function toMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function toIsoAtMinutes(scheduleDate: string, minutes: number): string {
  const hh = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mm = (minutes % 60).toString().padStart(2, "0");
  return `${scheduleDate}T${hh}:${mm}:00.000Z`;
}

function durationMinutes(task: GeneratedTaskInput): number {
  return toMinutes(task.ends_at) - toMinutes(task.starts_at);
}

function sessionBucket(startMin: number): "morning_9_12" | "afternoon_12_17" | "evening_17_22" | null {
  if (startMin >= 9 * 60 && startMin < 12 * 60) return "morning_9_12";
  if (startMin >= 12 * 60 && startMin < 17 * 60) return "afternoon_12_17";
  if (startMin >= 17 * 60 && startMin < 22 * 60) return "evening_17_22";
  return null;
}

function normalizeTitle(title: string): "Study Session" | "Assignment" {
  const t = title.toLowerCase();
  if (t.includes("assignment") || t.includes("homework") || t.includes("practice")) {
    return "Assignment";
  }
  return "Study Session";
}

function isFreeTimeTitle(title: string): boolean {
  return inferTaskKind({ title, category: "life" }) === "free_time";
}

function mergeAdjacentFreeTime(tasks: GeneratedTaskInput[]): GeneratedTaskInput[] {
  if (tasks.length === 0) return [];
  const out: GeneratedTaskInput[] = [];
  for (const task of tasks) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.category === "life" &&
      task.category === "life" &&
      prev.title === "Free Time" &&
      task.title === "Free Time" &&
      prev.ends_at === task.starts_at
    ) {
      out[out.length - 1] = { ...prev, ends_at: task.ends_at };
      continue;
    }
    out.push(task);
  }
  return out;
}

export function enforceStudySessionTargets(
  tasks: GeneratedTaskInput[],
  life: LifeVariables,
): GeneratedTaskInput[] {
  let studyLeft = Math.max(0, Math.floor(life.study_sessions_target));
  let assignmentLeft = Math.max(0, Math.floor(life.assignment_sessions_target));
  const intervalLeft = {
    morning_9_12: Math.max(0, Math.floor(life.session_interval_targets.morning_9_12)),
    afternoon_12_17: Math.max(0, Math.floor(life.session_interval_targets.afternoon_12_17)),
    evening_17_22: Math.max(0, Math.floor(life.session_interval_targets.evening_17_22)),
  };

  const normalized: GeneratedTaskInput[] = tasks.map((task): GeneratedTaskInput => {
    const kind = inferTaskKind({ title: task.title, category: task.category });
    if (task.category === "life" && kind === "free_time") {
      return { ...task, title: titleForKind(kind, "life") };
    }
    if (task.category === "life" && task.title.toLowerCase() === "review") {
      return { ...task, category: "study" as const, title: "Study Session" };
    }
    if (task.category === "study") {
      const studyKind = inferTaskKind({ title: task.title, category: "study" });
      return { ...task, title: titleForKind(studyKind, "study") };
    }
    return { ...task, title: titleForKind(kind, task.category) };
  });

  const enforced: GeneratedTaskInput[] = normalized.map((task): GeneratedTaskInput => {
    if (task.category !== "study") return task;
    const normalized = normalizeTitle(task.title);
    const start = toMinutes(task.starts_at);
    const bucket = sessionBucket(start);
    if (!bucket || intervalLeft[bucket] <= 0) {
      return { ...task, category: "life", title: "Personal Time" };
    }
    if (normalized === "Assignment") {
      if (assignmentLeft <= 0) {
        return { ...task, category: "life", title: "Personal Time" };
      }
      assignmentLeft -= 1;
    } else {
      if (studyLeft <= 0) {
        return { ...task, category: "life", title: "Personal Time" };
      }
      studyLeft -= 1;
    }
    intervalLeft[bucket] -= 1;
    return { ...task, title: normalized };
  });

  const tryFillFromFreeTime: GeneratedTaskInput[] = enforced.map((task): GeneratedTaskInput => {
    if (task.category !== "life" || task.title !== "Free Time") return task;
    if (studyLeft + assignmentLeft <= 0) return task;
    if (durationMinutes(task) < 20) return task;
    const bucket = sessionBucket(toMinutes(task.starts_at));
    if (!bucket || intervalLeft[bucket] <= 0) return task;
    if (assignmentLeft > 0) {
      assignmentLeft -= 1;
      intervalLeft[bucket] -= 1;
      return { ...task, category: "study" as const, title: "Assignment" };
    }
    if (studyLeft > 0) {
      studyLeft -= 1;
      intervalLeft[bucket] -= 1;
      return { ...task, category: "study" as const, title: "Study Session" };
    }
    return task;
  });

  const sorted = tryFillFromFreeTime.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  return mergeAdjacentFreeTime(sorted).map((task) => {
    if (task.category === "life" && task.title === "Free Time" && durationMinutes(task) >= 20) {
      const start = toMinutes(task.starts_at);
      const end = toMinutes(task.ends_at);
      return {
        ...task,
        starts_at: toIsoAtMinutes(task.schedule_date, start),
        ends_at: toIsoAtMinutes(task.schedule_date, end),
      };
    }
    return task;
  });
}
