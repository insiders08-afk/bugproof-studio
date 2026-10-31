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

import { liveGate } from "@/lib/realitygate";
describe("live gate", () => {
  const base = { statusCode: 200, pageText: "Welcome Sign in Pricing", expectedTexts: ["Sign in", "Pricing"], forbiddenTexts: ["Something went wrong"] };
  it("passes when all expected texts appear", () => expect(liveGate(base).verdict).toBe("PASS"));
  it("server 500 is an application bug", () => expect(liveGate({ ...base, statusCode: 500 }).verdict).toBe("APPLICATION_BUG"));
  it("visible error text is an application bug", () => expect(liveGate({ ...base, pageText: base.pageText + " Something went wrong" }).verdict).toBe("APPLICATION_BUG"));
  it("missing expected label is drift", () => expect(liveGate({ ...base, expectedTexts: ["Create Endpoint"] }).verdict).toBe("DOCUMENTATION_DRIFT"));
  it("unreachable site is inconclusive", () => expect(liveGate({ ...base, statusCode: null, scrapeError: "x" }).verdict).toBe("INCONCLUSIVE"));
});
