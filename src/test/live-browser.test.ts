import { describe, expect, it } from "vitest";
import { BrowserAction, Decision, actionCode } from "@/lib/live-browser";

describe("observed browser actions", () => {
  it("rejects invented CSS clicks", () => {
    expect(BrowserAction.safeParse({ type: "click", selector: "a:has-text('Ratan')" }).success).toBe(false);
  });
  it("accepts visible Ratan Box Cricket text", () => {
    expect(BrowserAction.parse({ type: "click", text: "Ratan Box Cricket" })).toEqual({ type: "click", text: "Ratan Box Cricket" });
  });
  it("rejects unbounded waits", () => {
    expect(BrowserAction.safeParse({ type: "wait", milliseconds: 90000 }).success).toBe(false);
  });
  it("requires nonblank final evidence", () => {
    expect(Decision.safeParse({ done: true, reason: "", action: null, expectedTexts: [" "] }).success).toBe(false);
  });
  it("escapes regex characters in visible text", () => {
    expect(actionCode({ type: "click", text: "Book (slot)" })).toContain('Book \\\\(slot\\\\)');
  });
});