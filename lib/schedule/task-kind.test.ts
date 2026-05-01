import test from "node:test";
import assert from "node:assert/strict";
import { inferTaskKind, titleForKind } from "./task-kind";

test("infers life labels to free_time kind", () => {
  assert.equal(inferTaskKind({ title: "Personal Time", category: "life" }), "free_time");
  assert.equal(inferTaskKind({ title: "Leisure Time", category: "life" }), "free_time");
  assert.equal(inferTaskKind({ title: "Review", category: "life" }), "free_time");
});

test("maps kinds to canonical display titles", () => {
  assert.equal(titleForKind("morning_routine", "life"), "Morning Routine");
  assert.equal(titleForKind("go_to_gym", "life"), "Go to Gym");
  assert.equal(titleForKind("assignment", "study"), "Assignment");
  assert.equal(titleForKind("study_session", "study"), "Study Session");
});
