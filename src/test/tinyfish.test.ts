import { describe, expect, it } from "vitest";
import { liveGate } from "@/lib/realitygate";
import { parseTinyFishSseBlock } from "@/lib/tinyfish";

describe("TinyFish SSE parsing", () => {
  it("parses a data event", () => {
    expect(parseTinyFishSseBlock('event: message\ndata: {"type":"COMPLETE","status":"COMPLETED"}')).toEqual({ type: "COMPLETE", status: "COMPLETED" });
  });
  it("ignores empty and DONE events", () => {
    expect(parseTinyFishSseBlock(": keepalive")).toBeNull();
    expect(parseTinyFishSseBlock("data: [DONE]")).toBeNull();
  });
  it("rejects malformed JSON", () => { expect(() => parseTinyFishSseBlock("data: nope")).toThrow(); });
});

describe("TinyFish live evidence gate", () => {
  it("passes a completed workflow with visible success evidence", () => {
    expect(liveGate({ statusCode: null, pageText: "Saved successfully", expectedTexts: ["Saved successfully"], forbiddenTexts: [], agentOutcome: "success", requirementMet: "yes", evidenceIssues: [] }).verdict).toBe("PASS");
  });
  it("uses TinyFish failure without requiring visible error evidence", () => {
    expect(liveGate({ statusCode: null, pageText: "", expectedTexts: [], forbiddenTexts: [], agentOutcome: "failure" }).verdict).toBe("FAILED");
  });
  it("does not independently classify a failed test as an application bug", () => {
    expect(liveGate({ statusCode: null, pageText: "Internal Server Error", expectedTexts: [], forbiddenTexts: ["Internal Server Error"], agentOutcome: "failure" }).verdict).toBe("FAILED");
  });
  it("keeps blocked runs inconclusive", () => {
    expect(liveGate({ statusCode: null, pageText: "", expectedTexts: [], forbiddenTexts: [], agentOutcome: "blocked" }).verdict).toBe("INCONCLUSIVE");
  });
  it("fails when booking is required but TinyFish found it unavailable, even if TinyFish said success", () => {
    expect(liveGate({ statusCode: null, pageText: "Book slot. Online booking is not active for this venue yet.", expectedTexts: ["Book slot", "Online booking is not active for this venue yet."], forbiddenTexts: [], agentOutcome: "success", requirementMet: "no", runStatus: "COMPLETED", evidenceIssues: [] }).verdict).toBe("FAILED");
  });
});