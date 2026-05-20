import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeRedirectPath } from "./safe-error";

describe("safeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    assert.equal(safeRedirectPath("/dashboard"), "/dashboard");
    assert.equal(safeRedirectPath("/dashboard/constraints"), "/dashboard/constraints");
  });

  it("rejects open redirects", () => {
    assert.equal(safeRedirectPath("//evil.com"), "/dashboard");
    assert.equal(safeRedirectPath("https://evil.com"), "/dashboard");
    assert.equal(safeRedirectPath(null), "/dashboard");
    assert.equal(safeRedirectPath("/\\evil"), "/dashboard");
  });
});
