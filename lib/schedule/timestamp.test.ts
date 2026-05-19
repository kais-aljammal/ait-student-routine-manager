import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTimestamp } from "./timestamp";

test("normalizeTimestamp treats HH:MM as wall time in user timezone", () => {
  const iso = normalizeTimestamp("14:30", "2025-06-15", "Europe/Istanbul");
  assert.equal(iso, "2025-06-15T11:30:00.000Z");
});

test("normalizeTimestamp parses ISO strings with offset", () => {
  const iso = normalizeTimestamp(
    "2025-06-15T14:30:00+03:00",
    "2025-06-15",
    "Europe/Istanbul",
  );
  assert.equal(iso, "2025-06-15T11:30:00.000Z");
});
