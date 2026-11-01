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
  const base = { statusCode: 200, pageText: "Welcome Sign in Pricing", expectedTexts: ["Sign in", "Pricing"], forbiddenTexts: ["Something went wrong"], agentOutcome: "success" as const };
  it("passes when all expected texts appear", () => expect(liveGate(base).verdict).toBe("PASS"));
  it("HTTP errors do not override TinyFish success", () => expect(liveGate({ ...base, statusCode: 500 }).verdict).toBe("PASS"));
  it("visible errors do not override TinyFish success", () => expect(liveGate({ ...base, pageText: base.pageText + " Something went wrong" }).verdict).toBe("PASS"));
  it("missing expected labels do not override TinyFish success", () => expect(liveGate({ ...base, expectedTexts: ["Create Endpoint"] }).verdict).toBe("PASS"));
  it("missing scrape data does not override TinyFish success", () => expect(liveGate({ ...base, statusCode: null, scrapeError: "x" }).verdict).toBe("PASS"));
  it("intermediate click errors do not override TinyFish success", () => expect(liveGate({ ...base, actionsError: "click timeout" }).verdict).toBe("PASS"));
  it("unknown page status does not override TinyFish success", () => expect(liveGate({ ...base, statusCode: null }).verdict).toBe("PASS"));
  it("matches casing and whitespace variations", () => expect(liveGate({ ...base, pageText: "SIGN   IN\nPricing" }).verdict).toBe("PASS"));
  it("blank expectations do not override TinyFish success", () => expect(liveGate({ ...base, expectedTexts: [" "] }).verdict).toBe("PASS"));
  it("TinyFish failure maps to FAILED even when text matches", () => expect(liveGate({ ...base, agentOutcome: "failure" }).verdict).toBe("FAILED"));
  it.each(["blocked", "incomplete", "unknown"] as const)("keeps TinyFish %s inconclusive", agentOutcome => expect(liveGate({ ...base, agentOutcome }).verdict).toBe("INCONCLUSIVE"));
  it("missing outcome cannot pass", () => expect(liveGate({ statusCode: base.statusCode, pageText: base.pageText, expectedTexts: base.expectedTexts, forbiddenTexts: base.forbiddenTexts }).verdict).toBe("INCONCLUSIVE"));
});
