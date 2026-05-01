import test from "node:test";
import assert from "node:assert/strict";
import { addDaysToDateString } from "../date";
import {
  getDateLabel,
  getTomorrowDate,
  isValidScheduleDate,
} from "./date-selection";

test("addDaysToDateString increments day boundaries safely", () => {
  assert.equal(addDaysToDateString("2026-05-01", 1), "2026-05-02");
  assert.equal(addDaysToDateString("2026-01-31", 1), "2026-02-01");
  assert.equal(addDaysToDateString("2024-02-28", 1), "2024-02-29");
});

test("date selection labels today and tomorrow correctly", () => {
  const today = "2026-05-01";
  assert.equal(getTomorrowDate(today), "2026-05-02");
  assert.equal(getDateLabel("2026-05-01", today), "today");
  assert.equal(getDateLabel("2026-05-02", today), "tomorrow");
  assert.equal(getDateLabel("2026-05-03", today), "custom");
});

test("date validation accepts only YYYY-MM-DD", () => {
  assert.equal(isValidScheduleDate("2026-05-01"), true);
  assert.equal(isValidScheduleDate("2026-5-1"), false);
  assert.equal(isValidScheduleDate("05/01/2026"), false);
  assert.equal(isValidScheduleDate(""), false);
});
