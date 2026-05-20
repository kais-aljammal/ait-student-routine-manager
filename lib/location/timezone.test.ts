import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidIanaTimeZone,
  resolveEffectiveTimeZone,
} from "./timezone.ts";

test("isValidIanaTimeZone accepts known zones", () => {
  assert.equal(isValidIanaTimeZone("Europe/London"), true);
  assert.equal(isValidIanaTimeZone("Asia/Riyadh"), true);
  assert.equal(isValidIanaTimeZone("Not/AZone"), false);
});

test("resolveEffectiveTimeZone prefers manual profile timezone", () => {
  const result = resolveEffectiveTimeZone({
    profileTimeZone: "Asia/Riyadh",
    timezoneSource: "manual",
  });
  assert.equal(result.timeZone, "Asia/Riyadh");
  assert.equal(result.source, "manual");
  assert.equal(result.shouldAutoPersist, false);
});

test("resolveEffectiveTimeZone uses browser over stale auto-detected profile", () => {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const result = resolveEffectiveTimeZone({
    profileTimeZone: "Asia/Riyadh",
    timezoneSource: "signup",
  });
  assert.equal(result.timeZone, browserTz);
  assert.equal(result.source, "browser");
  if (browserTz !== "Asia/Riyadh") {
    assert.equal(result.shouldAutoPersist, true);
  }
});
