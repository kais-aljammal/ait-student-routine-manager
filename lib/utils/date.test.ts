import test from "node:test";
import assert from "node:assert/strict";
import { isValidCalendarDate } from "./date";

test("isValidCalendarDate rejects invalid calendar dates", () => {
  assert.equal(isValidCalendarDate("2025-02-31"), false);
  assert.equal(isValidCalendarDate("2025-13-01"), false);
  assert.equal(isValidCalendarDate("0000-00-00"), false);
});

test("isValidCalendarDate accepts valid dates", () => {
  assert.equal(isValidCalendarDate("2026-05-01"), true);
  assert.equal(isValidCalendarDate("2024-02-29"), true);
  assert.equal(isValidCalendarDate("2026-5-1"), false);
});
