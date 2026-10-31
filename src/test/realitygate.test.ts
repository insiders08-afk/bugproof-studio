import { describe, expect, it } from "vitest";
import { evidenceGate, replayGuardrail, runSandbox } from "@/lib/realitygate";

describe("evidence gate", () => {
  it("classifies 500 on save as application bug", () => {
    expect(evidenceGate(runSandbox("bug").evidence).verdict).toBe("APPLICATION_BUG");
  });
  it("classifies renamed button with working save as documentation drift", () => {
    expect(evidenceGate(runSandbox("drift").evidence).verdict).toBe("DOCUMENTATION_DRIFT");
  });
  it("repaired target is not reproduced", () => {
    expect(evidenceGate(runSandbox("repaired").evidence).verdict).toBe("NOT_REPRODUCED");
  });
  it("guardrail fails before fix and passes after", () => {
    expect(replayGuardrail("bug").every((s) => s.pass)).toBe(false);
    expect(replayGuardrail("repaired").every((s) => s.pass)).toBe(true);
  });
});
