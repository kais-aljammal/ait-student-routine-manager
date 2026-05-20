export type TaskWindowInput = {
  starts_at: string;
  ends_at: string;
  completed: boolean;
};

/**
 * True when an unchecked task's time window has ended for the given schedule day.
 * - Future dates: never missed.
 * - Past dates: unchecked tasks are missed.
 * - Today: missed only after ends_at (UTC instant comparison).
 */
export function isTaskMissed(
  task: TaskWindowInput,
  nowMs: number,
  scheduleDate: string,
  todayDate: string,
): boolean {
  if (task.completed) return false;
  if (scheduleDate > todayDate) return false;
  const endMs = Date.parse(task.ends_at);
  if (!Number.isFinite(endMs)) return false;
  if (scheduleDate < todayDate) return true;
  return nowMs > endMs;
}
