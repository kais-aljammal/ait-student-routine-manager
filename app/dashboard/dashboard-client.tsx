"use client";

import { createClient } from "@/lib/supabase/client";
import {
  formatTimeInTimeZone,
  getDashboardCalendarTimeZone,
  getTodayDateStringInTimeZone,
} from "@/lib/date";
import {
  getDateLabel,
  getTomorrowDate,
  isValidScheduleDate,
} from "@/lib/dashboard/date-selection";
import { isTaskMissed } from "@/lib/dashboard/task-status";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LogoutButton } from "./logout-button";

export type TaskRow = {
  id: string;
  title: string;
  category: "class" | "study" | "life";
  starts_at: string;
  ends_at: string;
  schedule_date: string;
  completed: boolean;
};

type Props = {
  userEmail: string;
  profileName: string | null;
  timeZone: string;
  todayDate: string;
  initialSelectedDate: string;
  initialTelegramChatId: string | null;
};

function categoryCardClasses(cat: TaskRow["category"]): string {
  switch (cat) {
    case "class":
      return "border-blue-500/50 bg-blue-900/20 text-blue-100";
    case "study":
      return "border-cyan-400/50 bg-cyan-900/20 text-cyan-50";
    case "life":
      return "border-slate-500/50 bg-slate-800/40 text-slate-200";
  }
}

function categoryDotColor(cat: TaskRow["category"]): string {
  switch (cat) {
    case "class":
      return "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]";
    case "study":
      return "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]";
    case "life":
      return "bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.8)]";
  }
}

function mapErrorMessage(
  error: unknown,
  status?: number,
  fallback = "Something went wrong on our end. Please try again in a moment.",
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;
  if (raw.toLowerCase().includes("timeout")) {
    return "This is taking too long. Please try again.";
  }
  if (status === 401) {
    return "Your session expired. Please sign in again.";
  }
  if (status === 500) {
    return "Something went wrong on our end. Please try again in a moment.";
  }
  if (
    raw.toLowerCase().includes("network") ||
    raw.toLowerCase().includes("failed to fetch")
  ) {
    return "Connection problem. Please check your internet and try again.";
  }
  return raw || fallback;
}

async function parseApiResponse<T extends Record<string, unknown>>(
  response: Response,
): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const rawText = await response.text();
  const stripped = rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return {
    error:
      stripped ||
      "Server returned a non-JSON response. Please try again in a moment.",
  } as unknown as T;
}

export function DashboardClient({
  userEmail,
  profileName,
  timeZone,
  todayDate,
  initialSelectedDate,
  initialTelegramChatId,
}: Props) {
  const [calendarToday, setCalendarToday] = useState(todayDate);
  const [calendarTzLabel, setCalendarTzLabel] = useState(timeZone);
  const [calendarUsesBrowserFallback, setCalendarUsesBrowserFallback] = useState(false);

  const tomorrowDate = getTomorrowDate(calendarToday);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [telegramId, setTelegramId] = useState(initialTelegramChatId ?? "");
  const [telegramMsg, setTelegramMsg] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const scheduleDate = selectedDate;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("date") === scheduleDate) return;
    params.set("date", scheduleDate);
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, [scheduleDate]);

  const cacheKey = `tasks-${scheduleDate}`;
  const dateLabel = getDateLabel(scheduleDate, calendarToday);
  const isTodaySelected = dateLabel === "today";
  const isTomorrowSelected = dateLabel === "tomorrow";
  const selectedDateLabel = dateLabel === "custom" ? scheduleDate : dateLabel;

  useEffect(() => {
    setTelegramId(initialTelegramChatId ?? "");
  }, [initialTelegramChatId]);

  useEffect(() => {
    const { calendarTimeZone, usesBrowserFallback } = getDashboardCalendarTimeZone(timeZone);
    const recomputedToday = getTodayDateStringInTimeZone(calendarTimeZone);
    setCalendarToday(recomputedToday);
    setCalendarTzLabel(calendarTimeZone);
    setCalendarUsesBrowserFallback(usesBrowserFallback);

    setSelectedDate((prev) => {
      if (prev === todayDate && recomputedToday !== todayDate) {
        return recomputedToday;
      }
      if (prev < recomputedToday) {
        return recomputedToday;
      }
      return prev;
    });
  }, [timeZone, todayDate]);

  useEffect(() => {
    if (!calendarUsesBrowserFallback) return;
    if (!calendarTzLabel || calendarTzLabel.toUpperCase() === "UTC") return;
    let cancelled = false;
    const syncTimezone = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        await supabase
          .from("profiles")
          .update({ timezone: calendarTzLabel })
          .eq("id", user.id);
      } catch {
        // best-effort profile backfill only
      }
    };
    void syncTimezone();
    return () => {
      cancelled = true;
    };
  }, [calendarUsesBrowserFallback, calendarTzLabel]);

  const progressPercent = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.completed).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const doneCount = tasks.filter((t) => t.completed).length;
  const currentTask = useMemo(() => {
    if (tasks.length === 0) return null;
    const pending = tasks.filter(t => !t.completed);
    return pending.length > 0 ? pending[0] : null;
  }, [tasks]);

  const nextTask = useMemo(() => {
    if (tasks.length === 0) return null;
    const pending = tasks.filter(t => !t.completed);
    return pending.length > 1 ? pending[1] : null;
  }, [tasks]);

  function formatTaskTimeLabel(task: TaskRow): string {
    if (task.title === "Wake Up Time") {
      return formatTimeInTimeZone(task.ends_at, timeZone);
    }
    return `${formatTimeInTimeZone(task.starts_at, timeZone)} – ${formatTimeInTimeZone(task.ends_at, timeZone)}`;
  }

  function normalizeTasks(raw: unknown): TaskRow[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item): item is TaskRow => {
        if (!item || typeof item !== "object") return false;
        const rec = item as Record<string, unknown>;
        return (
          typeof rec.id === "string" &&
          typeof rec.title === "string" &&
          (rec.category === "class" ||
            rec.category === "study" ||
            rec.category === "life") &&
          typeof rec.starts_at === "string" &&
          typeof rec.ends_at === "string" &&
          typeof rec.schedule_date === "string" &&
          typeof rec.completed === "boolean"
        );
      })
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  }

  async function loadTasksForDate(force = false) {
    if (!isValidScheduleDate(scheduleDate)) {
      setTasks([]);
      setLoadError(null);
      setTasksLoading(false);
      return;
    }
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = normalizeTasks(JSON.parse(cached));
          // Don't trust empty cache — always verify with server
          if (parsed.length > 0) {
            setTasks(parsed);
            setLoadError(null);
            setTasksLoading(false);
            return;
          }
        } catch {
          sessionStorage.removeItem(cacheKey);
        }
      }
    }
    setTasksLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/tasks?schedule_date=${scheduleDate}`, {
        method: "GET",
      });
      const data = await parseApiResponse<{ error?: string; tasks?: unknown }>(res);
      if (!res.ok) {
        throw new Error(
          mapErrorMessage(data.error, res.status, "Failed to load tasks."),
        );
      }
      const normalized = normalizeTasks(data.tasks);
      sessionStorage.setItem(cacheKey, JSON.stringify(normalized));
      setTasks(normalized);
    } catch {
      setLoadError("Failed to load tasks. Please refresh.");
    } finally {
      setTasksLoading(false);
    }
  }

  useEffect(() => {
    void loadTasksForDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleDate]);

  useEffect(() => {
    setNowMs(Date.now());
    if (scheduleDate !== calendarToday) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [scheduleDate, calendarToday]);

  async function generateRoutine() {
    setGenerateError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_date: scheduleDate }),
      });
      const data = await parseApiResponse<{ error?: string; provider_errors?: string[] }>(res);
      if (!res.ok) {
        setGenerateError(mapErrorMessage(data.error, res.status, "Failed to generate schedule."));
        return;
      }
      await loadTasksForDate(true);
    } catch (err) {
      setGenerateError(mapErrorMessage(err, undefined, "Failed to generate schedule."));
    } finally {
      setGenerating(false);
    }
  }

  async function deleteTodayPlan() {
    setClearError(null);
    setClearLoading(true);
    if (!isValidScheduleDate(scheduleDate)) {
      setClearError("Please select a valid date.");
      setClearLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/tasks?schedule_date=${scheduleDate}`, {
        method: "DELETE",
      });
      const data = await parseApiResponse<{ error?: string }>(res);
      if (!res.ok) {
        setClearError(mapErrorMessage(data.error, res.status, "Failed to delete plan."));
        return;
      }
      sessionStorage.removeItem(cacheKey);
      setTasks([]);
    } catch (error) {
      setClearError(mapErrorMessage(error, undefined, "Failed to delete plan."));
    } finally {
      setClearLoading(false);
    }
  }

  const toggleTask = useCallback(async (task: TaskRow) => {
    const next = !task.completed;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: next } : t)),
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, completed: task.completed } : t,
          ),
        );
        setToggleError("Could not save - please try again");
        if (res.status === 401) window.location.href = "/login?next=/dashboard";
      } else {
        setTasks((prev) => {
          try { sessionStorage.setItem(cacheKey, JSON.stringify(prev)); } catch {}
          return prev;
        });
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: task.completed } : t,
        ),
      );
      setToggleError("Could not save - please try again");
    }
  }, [cacheKey]);

  async function saveTelegram() {
    setTelegramMsg(null);
    setTelegramLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTelegramMsg("Your session expired. Please sign in again.");
        window.location.href = "/login?next=/dashboard";
        return;
      }
      const trimmed = telegramId.trim();
      if (trimmed && !/^\d+$/.test(trimmed)) {
        setTelegramMsg("Chat ID must be a number");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: trimmed.length ? trimmed : null })
        .eq("id", user.id);
      if (error) {
        setTelegramMsg(mapErrorMessage(error.message, undefined, "Failed to save chat ID."));
        return;
      }
      setTelegramMsg("Saved.");
    } catch (error) {
      setTelegramMsg(mapErrorMessage(error, undefined, "Failed to save chat ID."));
    } finally {
      setTelegramLoading(false);
    }
  }

  function handleTelegramSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveTelegram();
  }

  return (
    <main className="relative min-h-screen bg-slate-950 px-4 py-8 sm:px-6 text-white font-sans overflow-x-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950 pointer-events-none z-0" />
      
      <div className="relative z-10 mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-blue-900/30 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Routine<span className="text-cyan-400">.ai</span>
            </h1>
            <p className="mt-1 text-sm text-blue-200/60">
              <span className="font-medium text-blue-100">{profileName || userEmail}</span>
            </p>
            <p className="mt-1 text-xs text-blue-300/50">
              Telegram reminders: {telegramId.trim() ? "connected" : "not connected"} (Settings)
            </p>
            <p className="mt-1 text-xs text-blue-300/40">
              {scheduleDate} ({calendarTzLabel})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-900/40 bg-slate-900/50 text-blue-300/80 transition-colors hover:bg-slate-800 hover:text-cyan-400"
              title="Settings"
            >
              ⚙️
            </button>
            <LogoutButton />
          </div>
        </header>

        {/* Date Selection */}
        <section className="mb-8 rounded-2xl border border-blue-900/30 bg-slate-900/40 p-2 backdrop-blur-md shadow-lg inline-flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(calendarToday)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              isTodaySelected
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                : "text-blue-200/70 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(tomorrowDate)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              isTomorrowSelected
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                : "text-blue-200/70 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            Tomorrow
          </button>
          <div className="h-6 w-px bg-blue-900/40 mx-1" />
          <label className="flex items-center gap-2 text-sm text-blue-200/70 px-2 cursor-pointer">
            <span className="sr-only">Custom Date</span>
            <input
              type="date"
              value={selectedDate}
              min={calendarToday}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none outline-none text-blue-100 cursor-pointer focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.8] [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
            />
          </label>
        </section>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="col-span-1 sm:col-span-2 rounded-2xl border border-blue-900/30 bg-slate-900/40 p-6 backdrop-blur-xl shadow-lg relative overflow-hidden flex flex-col justify-center min-h-[140px]">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-cyan-400 font-medium text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                Current Task
              </h3>
              <span className="text-xs font-medium text-blue-200/60 tabular-nums">
                {progressPercent}% Complete
              </span>
            </div>
            
            {currentTask ? (
              <>
                <p className="text-2xl font-bold text-white tracking-tight leading-tight truncate">
                  {currentTask.title}
                </p>
                <p className="text-sm text-blue-200/70 mt-1 mb-4">
                  {formatTaskTimeLabel(currentTask)}
                </p>
              </>
            ) : (
              <p className="text-lg font-medium text-blue-200/50 italic my-2">
                {tasks.length > 0 ? "All done for now! 🎉" : "No routine generated."}
              </p>
            )}

            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-auto">
              <div 
                className="h-full bg-cyan-400 rounded-full transition-[width] duration-700 ease-out shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
                style={{ width: `${tasks.length ? progressPercent : 0}%` }}
              />
            </div>
          </div>
          
          <div className="col-span-1 flex flex-col gap-4">
            <div className="flex-1 rounded-2xl border border-blue-900/30 bg-slate-900/40 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-center relative overflow-hidden">
              <h3 className="text-blue-300/70 font-medium text-xs uppercase tracking-wider mb-1">Up Next</h3>
              {nextTask ? (
                <>
                  <p className="font-semibold text-blue-100 truncate">{nextTask.title}</p>
                  <p className="text-xs text-blue-300/50 mt-0.5">{formatTaskTimeLabel(nextTask)}</p>
                </>
              ) : (
                <p className="text-sm text-blue-200/40 italic">Nothing planned.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={
                  tasks.length > 0
                    ? `/dashboard/constraints?date=${scheduleDate}&edit=1`
                    : "/dashboard/constraints"
                }
                className="flex-1 flex items-center justify-center rounded-xl bg-slate-800/80 border border-blue-900/50 py-2.5 text-xs font-semibold text-blue-100 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {tasks.length > 0 ? "✎ Edit" : "✎ Setup"}
              </Link>
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => void deleteTodayPlan()}
                disabled={clearLoading || tasks.length === 0}
                className="flex-1 flex items-center justify-center rounded-xl border border-red-900/30 bg-red-950/20 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-900/40 disabled:opacity-30 transition-colors"
                title={`Delete ${selectedDateLabel} plan`}
              >
                {clearLoading ? "..." : "🗑️ Clear"}
              </button>
            </div>
          </div>
        </div>

        {/* Main Timeline Content */}
        <section className="mb-16">
          {loadError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              {loadError}{" "}
              <button
                type="button"
                className="font-medium text-cyan-400 underline-offset-2 hover:underline"
                onClick={() => void loadTasksForDate(true)}
              >
                Retry
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-200/50">
              Timeline
            </h2>
            {tasks.length > 0 && !tasksLoading && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/constraints?date=${scheduleDate}&edit=1`}
                  className="text-xs font-medium text-blue-200/80 hover:text-cyan-300 hover:underline underline-offset-2"
                >
                  Edit schedule
                </Link>
                <button
                  type="button"
                  onClick={generateRoutine}
                  disabled={generating}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline underline-offset-2 disabled:opacity-50"
                >
                  {generating ? "Regenerating..." : "↻ Regenerate"}
                </button>
              </div>
            )}
          </div>

          {tasksLoading ? (
            <div className="space-y-4 pl-4 border-l border-blue-900/30 ml-4">
              {[1, 2, 3].map((placeholder) => (
                <div
                  key={placeholder}
                  className="h-24 animate-pulse rounded-2xl border border-blue-900/20 bg-slate-900/30 relative"
                >
                  <div className="absolute -left-[21px] top-8 w-2 h-2 rounded-full bg-blue-900/40" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-500/30 bg-blue-950/10 p-10 text-center backdrop-blur-sm shadow-xl mt-4">
              <div className="w-16 h-16 rounded-full bg-blue-900/40 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Routine Yet</h3>
              <p className="text-sm text-blue-200/70 mb-8 max-w-sm mx-auto">
                {isTodaySelected
                  ? "You haven't generated a schedule for today. Let AI optimize your day based on your constraints."
                  : `You haven't planned ${scheduleDate} yet.`}
              </p>
              
              {generateError && (
                <p className="mb-4 text-sm text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-900/50 inline-block">
                  {generateError}
                </p>
              )}

              <Link
                href="/dashboard/constraints"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-sm font-bold tracking-wide text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all hover:-translate-y-1"
              >
                ✨ Create New Routine
              </Link>
            </div>
          ) : (
            <div className="relative pl-4 sm:pl-8 border-l border-blue-900/30 ml-2 sm:ml-4">
              <div className="space-y-6">
                {tasks.map((task) => {
                  const missed = isTaskMissed(
                    task,
                    nowMs,
                    scheduleDate,
                    calendarToday,
                  );
                  return (
                  <div
                    key={task.id}
                    className={`relative transition-all duration-500 ${task.completed ? "opacity-40 translate-x-2" : "opacity-100"}`}
                  >
                    {/* Timeline Node */}
                    <div className={`absolute -left-[21px] sm:-left-[37px] top-6 w-2.5 h-2.5 rounded-full ring-4 ring-slate-950 ${categoryDotColor(task.category)} ${task.completed ? "bg-slate-600 shadow-none" : ""}`} />
                    
                    {/* Card */}
                    <label className={`block cursor-pointer rounded-2xl border backdrop-blur-md p-4 sm:p-5 shadow-lg transition-transform hover:-translate-y-0.5 ${categoryCardClasses(task.category)}`}>
                      <div className="flex gap-4 items-start">
                        <div className="mt-1 flex items-center justify-center">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${task.completed ? "bg-cyan-500 border-cyan-500" : "border-slate-400 bg-transparent"}`}>
                            <input
                              suppressHydrationWarning
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => void toggleTask(task)}
                              className="opacity-0 absolute w-5 h-5 cursor-pointer"
                            />
                            {task.completed && (
                              <svg className="w-3.5 h-3.5 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                            <span className={`block font-semibold text-lg tracking-tight truncate ${task.completed ? "line-through text-slate-400" : ""}`}>
                              {task.title}
                            </span>
                          </div>
                          <span className={`block text-sm font-medium ${task.completed ? "opacity-50" : "opacity-80"}`}>
                            {formatTaskTimeLabel(task)}
                          </span>
                          {missed && (
                            <span className="mt-1.5 inline-block text-xs font-medium text-amber-400/90">
                              You missed this time
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
          {toggleError && (
            <p className="mt-4 rounded-xl bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-400">
              {toggleError}
            </p>
          )}
        </section>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-blue-900/50 bg-slate-900 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSettingsOpen(false)}
              className="absolute right-4 top-4 text-blue-300/50 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              ⚙️ Settings
            </h2>
            <p className="text-xs text-blue-200/70 mb-6">
              Configure optional features like Telegram alerts.
            </p>
            
            <form onSubmit={handleTelegramSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-blue-100">Telegram Chat ID</span>
                <input
                  suppressHydrationWarning
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 123456789"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ""))}
                  className="rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-blue-300/30 outline-none ring-cyan-400/50 focus:border-cyan-400 focus:ring-2 transition-all"
                />
              </label>
              <p className="text-[11px] text-blue-200/50 leading-tight">
                Used to send you 15-minute reminders before tasks. Get your ID from @userinfobot.
              </p>
              
              <button
                suppressHydrationWarning
                type="submit"
                disabled={telegramLoading}
                className="mt-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
              >
                {telegramLoading ? "Saving…" : "Save Settings"}
              </button>
              
              {telegramMsg && (
                <p className={`text-sm text-center ${telegramMsg === "Saved." ? "text-cyan-400" : "text-red-400"}`}>
                  {telegramMsg}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
