"use client";

import { createClient } from "@/lib/supabase/client";
import {
  getDashboardCalendarTimeZone,
  getTodayDateStringInTimeZone,
} from "@/lib/date";
import {
  getTomorrowDate,
  isValidScheduleDate,
} from "@/lib/dashboard/date-selection";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Activity = {
  name: string;
  place: string;
  startTime: string;
  endTime: string;
};

type Answers = {
  wakeUpTime: string;
  activities: Activity[];
  breakfast: { time: string; location: string };
  lunch: { time: string; location: string };
  dinner: { time: string; location: string };
  sleepTime: string;
};

type Props = {
  initialScheduleDate: string | null;
  todayDate: string;
  timeZone: string;
  isEditMode: boolean;
};

type LifeVariablesPayload = {
  wake_up_time?: string;
  sleep_time?: string;
  breakfast?: { time?: string; location?: string };
  lunch?: { time?: string; location?: string };
  dinner?: { time?: string; location?: string };
  activities?: Array<{
    name?: string;
    place?: string;
    startTime?: string;
    start_time?: string;
    endTime?: string;
    end_time?: string;
  }>;
};

function hydrateAnswersFromLifeVariables(lv: LifeVariablesPayload): Answers {
  const activities = (lv.activities ?? []).map((a) => ({
    name: a.name ?? "",
    place: a.place ?? "",
    startTime: a.startTime ?? a.start_time ?? "",
    endTime: a.endTime ?? a.end_time ?? "",
  }));

  return {
    wakeUpTime: lv.wake_up_time ?? "",
    sleepTime: lv.sleep_time ?? "",
    breakfast: {
      time: lv.breakfast?.time ?? "",
      location: lv.breakfast?.location ?? "",
    },
    lunch: {
      time: lv.lunch?.time ?? "",
      location: lv.lunch?.location ?? "",
    },
    dinner: {
      time: lv.dinner?.time ?? "",
      location: lv.dinner?.location ?? "",
    },
    activities:
      activities.length > 0
        ? activities
        : [{ name: "", place: "", startTime: "", endTime: "" }],
  };
}

export function OnboardingFlow({
  initialScheduleDate,
  todayDate,
  timeZone,
  isEditMode,
}: Props) {
  const router = useRouter();
  const { calendarTimeZone } = useMemo(
    () => getDashboardCalendarTimeZone(timeZone),
    [timeZone],
  );
  const calendarToday = useMemo(
    () => getTodayDateStringInTimeZone(calendarTimeZone),
    [calendarTimeZone],
  );
  const tomorrowDate = getTomorrowDate(calendarToday);

  const [scheduleDate, setScheduleDate] = useState(
    initialScheduleDate ?? calendarToday,
  );
  const [currentScreen, setCurrentScreen] = useState(isEditMode ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [constraintsLoading, setConstraintsLoading] = useState(true);

  const [answers, setAnswers] = useState<Answers>({
    wakeUpTime: "",
    activities: [{ name: "", place: "", startTime: "", endTime: "" }],
    breakfast: { time: "", location: "" },
    lunch: { time: "", location: "" },
    dinner: { time: "", location: "" },
    sleepTime: "",
  });

  const totalSteps = isEditMode ? 4 : 5;
  const stepLabel =
    currentScreen === 0
      ? `Step 1 of ${totalSteps}`
      : isEditMode
        ? `Step ${currentScreen} of ${totalSteps}`
        : `Step ${currentScreen + 1} of ${totalSteps}`;

  const isScreen0Valid = isValidScheduleDate(scheduleDate);
  const isScreen1Valid = answers.wakeUpTime.trim() !== "";
  const isScreen2Valid = answers.activities.some(
    (a) =>
      a.name.trim() !== "" &&
      a.place.trim() !== "" &&
      a.startTime.trim() !== "" &&
      a.endTime.trim() !== "",
  );
  const isScreen3Valid =
    answers.breakfast.time.trim() !== "" &&
    answers.breakfast.location.trim() !== "" &&
    answers.lunch.time.trim() !== "" &&
    answers.lunch.location.trim() !== "" &&
    answers.dinner.time.trim() !== "" &&
    answers.dinner.location.trim() !== "";
  const isScreen4Valid = answers.sleepTime.trim() !== "";

  useEffect(() => {
    let cancelled = false;
    async function loadConstraints() {
      setConstraintsLoading(true);
      try {
        const res = await fetch("/api/constraints");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          life_variables?: LifeVariablesPayload | null;
        };
        if (cancelled || !data.life_variables) return;
        setAnswers(hydrateAnswersFromLifeVariables(data.life_variables));
      } catch {
        // Leave defaults on failure
      } finally {
        if (!cancelled) setConstraintsLoading(false);
      }
    }
    void loadConstraints();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBack = () => {
    if (currentScreen === 0) {
      router.push("/dashboard");
      return;
    }
    if (currentScreen === 1) {
      if (isEditMode) {
        router.push(`/dashboard?date=${scheduleDate}`);
      } else {
        setCurrentScreen(0);
      }
      return;
    }
    setCurrentScreen((s) => s - 1);
  };

  const handleSave = async () => {
    if (!isValidScheduleDate(scheduleDate)) {
      setSaveError("Please choose a valid date.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const life_variables = {
        wake_up_time: answers.wakeUpTime,
        sleep_time: answers.sleepTime,
        breakfast: {
          time: answers.breakfast.time,
          location: answers.breakfast.location,
        },
        lunch: { time: answers.lunch.time, location: answers.lunch.location },
        dinner: { time: answers.dinner.time, location: answers.dinner.location },
        activities: answers.activities.filter(
          (a) =>
            a.name.trim() !== "" &&
            a.place.trim() !== "" &&
            a.startTime.trim() !== "" &&
            a.endTime.trim() !== "",
        ),
      };

      const { error } = await supabase.from("constraints").upsert(
        {
          user_id: user.id,
          fixed_schedule: [],
          life_variables,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw error;
      }

      const res = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_date: scheduleDate }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to generate schedule from your constraints.",
        );
      }

      router.push(`/dashboard?date=${scheduleDate}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred while saving your routine.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const updateActivity = (index: number, field: keyof Activity, value: string) => {
    setAnswers((prev) => {
      const newActivities = [...prev.activities];
      newActivities[index] = { ...newActivities[index], [field]: value };
      return { ...prev, activities: newActivities };
    });
  };

  const addActivity = () => {
    setAnswers((prev) => ({
      ...prev,
      activities: [
        ...prev.activities,
        { name: "", place: "", startTime: "", endTime: "" },
      ],
    }));
  };

  const removeActivity = (index: number) => {
    setAnswers((prev) => {
      const newActivities = [...prev.activities];
      newActivities.splice(index, 1);
      return { ...prev, activities: newActivities };
    });
  };

  const updateMeal = (
    meal: "breakfast" | "lunch" | "dinner",
    field: "time" | "location",
    value: string,
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [meal]: { ...prev[meal], [field]: value },
    }));
  };

  const canContinue =
    (currentScreen === 0 && isScreen0Valid) ||
    (currentScreen === 1 && isScreen1Valid) ||
    (currentScreen === 2 && isScreen2Valid) ||
    (currentScreen === 3 && isScreen3Valid);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-blue-900/30 bg-slate-900/40 p-6 text-white shadow-2xl backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between border-b border-blue-900/30 pb-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm font-medium text-blue-300/60 transition-colors hover:text-cyan-400"
        >
          ← Back
        </button>
        <div className="text-xs font-semibold uppercase tracking-wider text-blue-200/50">
          {stepLabel}
        </div>
      </div>

      {isEditMode && (
        <p className="mb-4 text-sm text-cyan-300/90">
          Editing schedule for <span className="font-semibold">{scheduleDate}</span>.
          Saving will replace tasks for this date with a newly generated plan.
        </p>
      )}

      {saveError && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-900/50 p-4 text-sm text-red-200">
          {saveError}
        </div>
      )}

      {constraintsLoading && currentScreen >= 1 && (
        <div className="mb-6 h-32 animate-pulse rounded-xl border border-blue-900/30 bg-slate-950/40" />
      )}

      {currentScreen === 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="mb-2 text-xl font-medium text-white">
            Which day is this schedule for?
          </h2>
          <p className="mb-6 text-sm text-blue-200/70">
            Pick the date first. Your routine will be generated for that day only.
          </p>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScheduleDate(calendarToday)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                scheduleDate === calendarToday
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-blue-200/70 hover:bg-slate-800/50"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setScheduleDate(tomorrowDate)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                scheduleDate === tomorrowDate
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-blue-200/70 hover:bg-slate-800/50"
              }`}
            >
              Tomorrow
            </button>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-blue-100">Or choose a date</span>
            <input
              type="date"
              value={scheduleDate}
              min={calendarToday}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50"
            />
          </label>
        </div>
      )}

      {currentScreen === 1 && !constraintsLoading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <label className="mb-4 block text-xl font-medium text-white">I wake up at</label>
          <input
            type="time"
            value={answers.wakeUpTime}
            onChange={(e) => setAnswers({ ...answers, wakeUpTime: e.target.value })}
            className="w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-white transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
        </div>
      )}

      {currentScreen === 2 && !constraintsLoading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="mb-2 text-xl font-medium text-white">What do you have today?</h2>
          <p className="mb-6 text-sm text-blue-200/70">
            Add anything fixed in your day — classes, gym, meetings, hangouts, anything.
          </p>

          <div className="space-y-4">
            {answers.activities.map((activity, idx) => (
              <div
                key={idx}
                className="relative rounded-xl border border-blue-900/40 bg-slate-950/40 p-4"
              >
                {answers.activities.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeActivity(idx)}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-blue-300/50 transition-colors hover:bg-red-900/30 hover:text-red-400"
                  >
                    ✕
                  </button>
                )}

                <div className="mb-3">
                  <label className="mb-1 block text-sm text-blue-200/70">Activity</label>
                  <input
                    type="text"
                    placeholder="e.g. Calculus, Gym, Team Meeting"
                    value={activity.name}
                    onChange={(e) => updateActivity(idx, "name", e.target.value)}
                    className="w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-3 py-2 text-white placeholder-blue-300/30 transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-sm text-blue-200/70">Place</label>
                  <input
                    type="text"
                    placeholder="e.g. University, Gym, Café"
                    value={activity.place}
                    onChange={(e) => updateActivity(idx, "place", e.target.value)}
                    className="w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-3 py-2 text-white placeholder-blue-300/30 transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-blue-200/70">From</label>
                    <input
                      type="time"
                      value={activity.startTime}
                      onChange={(e) => updateActivity(idx, "startTime", e.target.value)}
                      className="w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-3 py-2 text-white transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-blue-200/70">To</label>
                    <input
                      type="time"
                      value={activity.endTime}
                      onChange={(e) => updateActivity(idx, "endTime", e.target.value)}
                      className="w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-3 py-2 text-white transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addActivity}
            className="mt-4 w-full rounded-xl border border-dashed border-blue-900/50 py-3 text-sm font-medium text-blue-200/60 transition-colors hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-900/10"
          >
            + Add Activity
          </button>
        </div>
      )}

      {currentScreen === 3 && !constraintsLoading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="mb-6 text-xl font-medium text-white">When and where do you eat?</h2>

          <div className="space-y-4">
            {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
              <div
                key={meal}
                className="rounded-xl border border-blue-900/40 bg-slate-950/40 p-4"
              >
                <h3 className="mb-3 font-medium text-blue-100 capitalize">{meal}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="time"
                    value={answers[meal].time}
                    onChange={(e) => updateMeal(meal, "time", e.target.value)}
                    className="w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-3 py-2 text-white transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                  <input
                    type="text"
                    placeholder="Where?"
                    value={answers[meal].location}
                    onChange={(e) => updateMeal(meal, "location", e.target.value)}
                    className="w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-3 py-2 text-white placeholder-blue-300/30 transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentScreen === 4 && !constraintsLoading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <label className="mb-4 block text-xl font-medium text-white">I go to sleep at</label>
          <input
            type="time"
            value={answers.sleepTime}
            onChange={(e) => setAnswers({ ...answers, sleepTime: e.target.value })}
            className="mb-8 w-full rounded-xl border border-blue-900/50 bg-slate-950/50 px-4 py-3 text-white transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isScreen4Valid}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {saving
              ? "Saving..."
              : isEditMode
                ? "Save & Regenerate"
                : "Save & Generate"}
          </button>
        </div>
      )}

      {currentScreen < 4 && (
        <div className="mt-8 border-t border-blue-900/30 pt-6">
          <button
            type="button"
            onClick={() => setCurrentScreen((s) => s + 1)}
            disabled={!canContinue}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-semibold text-white transition-all hover:from-cyan-500 hover:to-blue-500 disabled:bg-slate-800 disabled:from-slate-800 disabled:to-slate-800 disabled:text-blue-200/30 disabled:hover:translate-y-0"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
