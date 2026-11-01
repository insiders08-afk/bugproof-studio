import { describe, expect, it } from "vitest";
import { bridgeTinyFish } from "@/lib/tinyfish-bridge";
import { liveGate } from "@/lib/realitygate";
import { replayActions } from "@/lib/live-contract";

const result = { outcome: "success", final_url: "https://bookmyboxcric.lovable.app", expected_texts: ["Book slot", "Online booking is not active for this venue yet"], final_text: "Book slot. Online booking is not active for this venue yet.", steps: [], screenshots: [] };
const artifacts = { runId: "run-1", status: "COMPLETED", result, steps: [{ stepId: "step-1", label: "Open Not Out", status: "RUNNING", image: "data:image/png;base64,AAAA" }, { stepId: "step-2", label: "Check Book slot", status: "RUNNING", image: "data:image/png;base64,AAAA" }] };
describe("TinyFish native evidence bridge", () => {
  it("normalizes a provider's no-error sentinel without hiding real errors", () => {
    expect(bridgeTinyFish({ ...result, error: "none" }, artifacts).observation?.error).toBe("");
    expect(bridgeTinyFish({ ...result, error: "Button timed out" }, artifacts).observation?.error).toBe("Button timed out");
  });
  it("preserves native steps and screenshots when structured arrays are empty", () => {
    const b = bridgeTinyFish(result, artifacts);
    expect(b.nativeSteps).toHaveLength(2); expect(b.captures).toHaveLength(2); expect(b.issues).toEqual([]);
    expect(b.warnings.some(w => w.includes("Photo readiness not measured"))).toBe(true);
  });
  it("tolerates malformed optional arrays without losing core conclusions", () => {
    const b = bridgeTinyFish({ ...result, steps: ["clicked card"], screenshots: "unavailable", network: [{ status: 999 }] }, artifacts);
    expect(b.observation?.outcome).toBe("success"); expect(b.issues).toEqual([]); expect(b.observation?.network).toEqual([]);
  });
  it("passes a provider-backed successful negative check without inventing network or photo counts", () => {
    const b = bridgeTinyFish(result, artifacts); const o = b.observation;
    if (!o) throw new Error("Missing observation");
    expect(liveGate({ statusCode: null, pageText: o.final_text, expectedTexts: o.expected_texts, forbiddenTexts: [], agentOutcome: o.outcome, evidenceIssues: b.issues }).verdict).toBe("PASS");
    expect(o.network).toEqual([]); expect(o.screenshots).toEqual([]);
  });
  it("does not pass solely on a completion status", () => {
    expect(bridgeTinyFish({ status: "COMPLETED" }, { ...artifacts, result: null }).outcome).toBe("unknown");
    expect(bridgeTinyFish(result).issues).toContain("No native TinyFish workflow steps were retrieved.");
  });
  it("retains explicit success when the report contract is invalid", () => {
    const b = bridgeTinyFish({ outcome: "success", summary: "Requested check succeeded" });
    expect(b.observation).toBeUndefined(); expect(b.outcome).toBe("success"); expect(b.summary).toBe("Requested check succeeded");
    expect(liveGate({ statusCode: null, pageText: "", expectedTexts: [], forbiddenTexts: [], agentOutcome: b.outcome, evidenceIssues: b.issues }).verdict).toBe("PASS");
  });
  it("retains failure when the report contract is invalid", () => {
    expect(bridgeTinyFish({ outcome: "failure" }).outcome).toBe("failure");
  });
  it("uses native outcome only when the streamed outcome is absent or invalid", () => {
    expect(bridgeTinyFish({}, artifacts).outcome).toBe("success");
    expect(bridgeTinyFish({ outcome: "failure" }, artifacts).outcome).toBe("failure");
  });
  it("normalizes outcome casing without interpreting completion as success", () => {
    expect(bridgeTinyFish({ outcome: " SUCCESS " }).outcome).toBe("success");
    expect(bridgeTinyFish({ outcome: "COMPLETED" }).outcome).toBe("unknown");
  });
  it("does not accept invented screenshot URLs as native pixels", () => {
    const b = bridgeTinyFish({ ...result, screenshots: [{ url: "https://example.com/image.jpg" }] });
    expect(b.captures).toEqual([]); expect(b.issues).toContain("No authenticated TinyFish screenshot artifacts were retrieved.");
  });
  it("retains captures even when the core contract is invalid", () => {
    const b = bridgeTinyFish({ ...result, outcome: "COMPLETED" }, artifacts);
    expect(b.observation).toBeUndefined(); expect(b.captures).toHaveLength(2);
  });
  it("retains all twelve provider success criteria rather than rejecting a legacy ten-item cap", () => {
    const expected = Array.from({ length: 12 }, (_, i) => `Visible criterion ${i}`);
    const b = bridgeTinyFish({ ...result, expected_texts: expected }, artifacts);
    expect(b.observation?.expected_texts).toEqual(expected); expect(b.issues).toEqual([]);
  });
  it("does not convert native descriptions into executable clicks", () => {
    const b = bridgeTinyFish(result, artifacts);
    if (!b.observation) throw new Error("Missing observation");
    expect(replayActions(b.observation)).toEqual([]);
  });
  it("rejects partial replay sequences rather than dropping a required unsafe step", () => {
    const b = bridgeTinyFish({ ...result, steps: [{ action: { type: "click", text: "Book slot" }, targetVisible: true, beforeText: "Book slot", afterText: "DATE", ok: true }, { action: { type: "click", text: "Confirm booking" }, targetVisible: true, beforeText: "Confirm booking", afterText: "Booked", ok: true }] }, artifacts);
    if (!b.observation) throw new Error("Missing observation");
    expect(replayActions(b.observation)).toEqual([]);
  });
});