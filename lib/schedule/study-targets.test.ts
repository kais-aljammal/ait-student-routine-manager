import test from "node:test";
import assert from "node:assert/strict";
import { defaultLifeVariables } from "@/lib/constraints/types";
import { enforceStudySessionTargets } from "./study-targets";

test("enforces study and interval targets by converting overflow to life", () => {
  const life = defaultLifeVariables();
  life.study_sessions_target = 1;
  life.assignment_sessions_target = 1;
  life.session_interval_targets = { morning_9_12: 1, afternoon_12_17: 1, evening_17_22: 0 };
  const scheduleDate = "2026-05-01";
  const tasks = [
    { title: "Study Session", category: "study" as const, starts_at: `${scheduleDate}T09:00:00.000Z`, ends_at: `${scheduleDate}T09:45:00.000Z`, schedule_date: scheduleDate },
    { title: "Assignment", category: "study" as const, starts_at: `${scheduleDate}T13:00:00.000Z`, ends_at: `${scheduleDate}T13:45:00.000Z`, schedule_date: scheduleDate },
    { title: "Study Session", category: "study" as const, starts_at: `${scheduleDate}T19:00:00.000Z`, ends_at: `${scheduleDate}T19:45:00.000Z`, schedule_date: scheduleDate },
  ];
  const out = enforceStudySessionTargets(tasks, life);
  assert.equal(out[0].category, "study");
  assert.equal(out[1].category, "study");
  assert.equal(out[2].category, "life");
});

test("merges adjacent free time and normalizes review", () => {
  const life = defaultLifeVariables();
  life.study_sessions_target = 2;
  life.assignment_sessions_target = 0;
  life.session_interval_targets = { morning_9_12: 0, afternoon_12_17: 2, evening_17_22: 0 };
  const scheduleDate = "2026-05-01";
  const tasks = [
    { title: "Personal Time", category: "life" as const, starts_at: `${scheduleDate}T15:00:00.000Z`, ends_at: `${scheduleDate}T15:20:00.000Z`, schedule_date: scheduleDate },
    { title: "Leisure Time", category: "life" as const, starts_at: `${scheduleDate}T15:20:00.000Z`, ends_at: `${scheduleDate}T15:40:00.000Z`, schedule_date: scheduleDate },
    { title: "Review", category: "life" as const, starts_at: `${scheduleDate}T16:00:00.000Z`, ends_at: `${scheduleDate}T16:30:00.000Z`, schedule_date: scheduleDate },
  ];
  const out = enforceStudySessionTargets(tasks, life);
  assert.equal(out.some((t) => t.category === "study" && t.title === "Study Session"), true);
  assert.equal(
    out.some((t) => t.title === "Personal Time" || t.title === "Leisure Time" || t.title === "Review"),
    false,
  );
});
