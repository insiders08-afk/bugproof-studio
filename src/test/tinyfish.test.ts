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
    expect(liveGate({ statusCode: null, pageText: "Saved successfully", expectedTexts: ["Saved successfully"], forbiddenTexts: [], agentOutcome: "success", evidenceIssues: [] }).verdict).toBe("PASS");
  });
  it("keeps a failure without visible error evidence inconclusive", () => {
    expect(liveGate({ statusCode: null, pageText: "", expectedTexts: [], forbiddenTexts: [], agentOutcome: "failure" }).verdict).toBe("INCONCLUSIVE");
  });
  it("classifies visible application error after failed workflow as bug", () => {
    expect(liveGate({ statusCode: null, pageText: "Internal Server Error", expectedTexts: [], forbiddenTexts: ["Internal Server Error"], agentOutcome: "failure" }).verdict).toBe("APPLICATION_BUG");
  });
  it("keeps blocked runs inconclusive", () => {
    expect(liveGate({ statusCode: null, pageText: "", expectedTexts: [], forbiddenTexts: [], agentOutcome: "blocked" }).verdict).toBe("INCONCLUSIVE");
  });
});