import { describe, expect, it } from "vitest";
import { AgentResult, observationIssues, publicWebUrl, replayActions } from "@/lib/live-contract";
import { liveGate } from "@/lib/realitygate";

const result = () => AgentResult.parse({ outcome: "success", final_url: "https://bookmyboxcric.lovable.app", expected_texts: ["DATE"], final_text: "Book your slot DATE", steps: [{ action: { type: "click", text: "Book slot" }, targetVisible: true, beforeText: "Ratan Box Cricket Book slot", afterText: "Book your slot DATE", ok: true }], screenshots: [{ url: "https://captures.example.com/shot.jpg", label: "Booking panel", readinessChecked: true, photos: { total: 3, loaded: 3, pending: 0, broken: 0 } }] });
describe("TinyFish production contract", () => {
  it("rejects private and credential-bearing target URLs", () => {
    for (const url of ["http://localhost", "http://127.0.0.1", "http://10.0.0.1", "http://169.254.169.254", "http://172.16.0.1", "http://192.168.1.2", "http://[::1]", "https://user:pass@example.com", "https://example.com:8080", "ftp://example.com"]) expect(publicWebUrl(url)).toBe(false);
    expect(publicWebUrl("https://bookmyboxcric.lovable.app")).toBe(true);
  });
  it("requires final-page text and nonempty success criteria", () => {
    expect(AgentResult.safeParse({ ...result(), expected_texts: [] }).success).toBe(false);
    expect(observationIssues({ ...result(), final_text: " " })).toContain("No final-page text was returned.");
  });
  it("blocks success when screenshot or photo readiness evidence is absent", () => {
    expect(observationIssues({ ...result(), screenshots: [] })).toContain("No screenshot evidence was returned.");
    const r = result(); r.screenshots[0] = { ...r.screenshots[0], url: "https://captures.example.com/shot.jpg", label: "Booking panel", readinessChecked: false, photos: { total: 3, loaded: 2, pending: 1, broken: 0 } };
    expect(observationIssues(r).length).toBeGreaterThan(0);
  });
  it("keeps failed or ungrounded actions out of replay recipes", () => {
    const r = result(); r.steps[0] = { ...r.steps[0], action: { type: "click", text: "Invented label" }, targetVisible: true, beforeText: "Book slot", afterText: "", ok: true };
    expect(replayActions(r)).toEqual([]); expect(observationIssues(r).length).toBeGreaterThan(0);
  });
  it("allows opening Book slot but rejects confirming a booking", () => {
    expect(replayActions(result())).toEqual([{ type: "click", text: "Book slot" }]);
    const r = result(); r.steps[0] = { action: { type: "click", text: "Confirm booking" }, targetVisible: true, beforeText: "Confirm booking", afterText: "Booked", ok: true };
    expect(replayActions(r)).toEqual([]);
  });
  it("preserves missing photos as an unknown, not a proven application failure", () => {
    const r = result(); r.screenshots[0] = { url: "https://captures.example.com/shot.jpg", label: "Panel", readinessChecked: true, photos: { total: 3, loaded: 2, pending: 0, broken: 1 } };
    expect(observationIssues(r)).toEqual([]);
  });
  it("makes missing evidence inconclusive even if agent says success", () => {
    expect(liveGate({ statusCode: 200, pageText: "DATE", expectedTexts: ["DATE"], forbiddenTexts: [], agentOutcome: "success", evidenceIssues: ["No screenshot evidence"] }).verdict).toBe("INCONCLUSIVE");
  });
  it("rejects invented HTTP status codes", () => {
    expect(liveGate({ statusCode: 999, pageText: "DATE", expectedTexts: ["DATE"], forbiddenTexts: [], agentOutcome: "success" }).verdict).toBe("INCONCLUSIVE");
  });
});