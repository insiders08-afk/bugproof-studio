import { describe, expect, it } from "vitest";
import { evidenceGate, replayGuardrail, runSandbox } from "@/lib/realitygate";

describe("evidence gate", () => {
  it("classifies 500 on save as application bug", () => {
    expect(evidenceGate(runSandbox("bug").evidence).verdict).toBe("APPLICATION_BUG");
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
  const base = { statusCode: 200, pageText: "Welcome Sign in Pricing", expectedTexts: ["Sign in", "Pricing"], forbiddenTexts: ["Something went wrong"], agentOutcome: "success" as const };
  it("passes when all expected texts appear", () => expect(liveGate(base).verdict).toBe("PASS"));
  it("server 500 is an application bug", () => expect(liveGate({ ...base, statusCode: 500 }).verdict).toBe("APPLICATION_BUG"));
  it("visible error text is an application bug", () => expect(liveGate({ ...base, pageText: base.pageText + " Something went wrong" }).verdict).toBe("APPLICATION_BUG"));
  it("missing expected label alone cannot prove drift", () => expect(liveGate({ ...base, expectedTexts: ["Create Endpoint"] }).verdict).toBe("INCONCLUSIVE"));
  it("unreachable site is inconclusive", () => expect(liveGate({ ...base, statusCode: null, scrapeError: "x" }).verdict).toBe("INCONCLUSIVE"));
  it("failed browser click is inconclusive even when baseline text matches", () => expect(liveGate({ ...base, actionsError: "click timeout" }).verdict).toBe("INCONCLUSIVE"));
  it("unknown page status cannot pass", () => expect(liveGate({ ...base, statusCode: null }).verdict).toBe("INCONCLUSIVE"));
  it("matches casing and whitespace variations", () => expect(liveGate({ ...base, pageText: "SIGN   IN\nPricing" }).verdict).toBe("PASS"));
  it("blank expectations cannot pass", () => expect(liveGate({ ...base, expectedTexts: [" "] }).verdict).toBe("INCONCLUSIVE"));
});
