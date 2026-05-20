import test from "node:test";
import assert from "node:assert/strict";
import { isTaskMissed } from "./task-status";

const task = {
  starts_at: "2026-05-01T08:00:00.000Z",
  ends_at: "2026-05-01T08:15:00.000Z",
  completed: false,
};

test("isTaskMissed is false for future schedule dates", () => {
  assert.equal(
    isTaskMissed(task, Date.parse("2026-05-01T09:00:00.000Z"), "2026-05-10", "2026-05-01"),
    false,
  );
});

test("isTaskMissed is true after ends_at on today", () => {
  assert.equal(
    isTaskMissed(task, Date.parse("2026-05-01T08:16:00.000Z"), "2026-05-01", "2026-05-01"),
    true,
  );
  assert.equal(
    isTaskMissed(task, Date.parse("2026-05-01T08:10:00.000Z"), "2026-05-01", "2026-05-01"),
    false,
  );
});

test("isTaskMissed is true for past dates when unchecked", () => {
  assert.equal(
    isTaskMissed(task, Date.now(), "2026-04-01", "2026-05-01"),
    true,
  );
});

test("isTaskMissed is false when completed", () => {
  assert.equal(
    isTaskMissed(
      { ...task, completed: true },
      Date.parse("2026-05-01T12:00:00.000Z"),
      "2026-05-01",
      "2026-05-01",
    ),
    false,
  );
});
