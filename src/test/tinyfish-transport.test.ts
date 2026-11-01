import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTinyFishCaptures, runTinyFishAgent, TinyFishRunError } from "@/lib/tinyfish";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function mockStream(chunks: string[]) {
  vi.stubEnv("TINYFISH_API_KEY", "test-only-placeholder");
  const encoder = new TextEncoder();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ start(controller) { chunks.forEach(c => controller.enqueue(encoder.encode(c))); controller.close(); } }), { headers: { "content-type": "text/event-stream" } })));
}
describe("TinyFish stream lifecycle", () => {
  it("handles fragmented CRLF events and preserves STARTED run IDs", async () => {
    mockStream(['data: {"type":"STAR', 'TED","run_id":"run-1"}\r\n\r\ndata: {"type":"HEARTBEAT"}\r\n\r\n', 'data: {"type":"COMPLETE","status":"COMPLETED","result":{"answer":42}}\r\n\r\n']);
    const r = await runTinyFishAgent("https://example.com", "Inspect page");
    expect(r.runId).toBe("run-1"); expect(r.result).toEqual({ answer: 42 });
  });
  it("retains run metadata on disconnected streams", async () => {
    mockStream(['data: {"type":"STARTED","run_id":"run-lost"}\n\n']);
    try { await runTinyFishAgent("https://example.com", "Inspect page"); throw new Error("Expected a failure"); }
    catch (e) { expect(e).toBeInstanceOf(TinyFishRunError); if (e instanceof TinyFishRunError) expect(e.run.runId).toBe("run-lost"); }
  });
  it("preserves failed status without exposing provider error bodies", async () => {
    mockStream(['data: {"type":"COMPLETE","run_id":"run-fail","status":"FAILED","error":"sensitive provider content"}\n\n']);
    await expect(runTinyFishAgent("https://example.com", "Inspect page")).rejects.toThrow("TinyFish run FAILED");
  });
  it("does not retry rate-limited billable requests", async () => {
    vi.stubEnv("TINYFISH_API_KEY", "test-only-placeholder");
    const fetcher = vi.fn(async () => new Response("private error", { status: 429 })); vi.stubGlobal("fetch", fetcher);
    await expect(runTinyFishAgent("https://example.com", "Inspect page")).rejects.toThrow("rate limited");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("requests screenshots with bounded execution", async () => {
    mockStream(['data: {"type":"COMPLETE","status":"COMPLETED","result":{}}\n\n']);
    await runTinyFishAgent("https://example.com", "Inspect page");
    const call = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(call?.[1]?.body));
    expect(body.capture_config).toEqual({ screenshots: true });
    expect(body.agent_config).toEqual({ max_duration_seconds: 180 });
    expect(body.agent_config).not.toHaveProperty("max_steps");
    expect(body.capture_config).not.toHaveProperty("elements");
    expect(body.capture_config).not.toHaveProperty("snapshots");
  });
  it("uses provider screenshot pixels rather than agent-provided URLs", async () => {
    vi.stubEnv("TINYFISH_API_KEY", "test-only-placeholder");
    const fetcher = vi.fn(async () => Response.json({ steps: [{ id: "step-1", action: "Open venue", screenshot: "data:image/png;base64,AAAA" }, { id: "fake", screenshot: "https://invented.example.com/photo.png" }] }));
    vi.stubGlobal("fetch", fetcher);
    expect(await fetchTinyFishCaptures("run-1")).toEqual([{ stepId: "step-1", image: "data:image/png;base64,AAAA", label: "Open venue" }]);
    expect(fetcher.mock.calls.length).toBe(1);
  });
  it("rejects unsafe capture identifiers before making a request", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(fetchTinyFishCaptures("../../other")).rejects.toThrow("Invalid TinyFish run identifier");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("distinguishes beta entitlement failures from invalid credentials without retrying", async () => {
    vi.stubEnv("TINYFISH_API_KEY", "test-only-placeholder");
    const fetcher = vi.fn(async () => Response.json({ error: { code: "FORBIDDEN", message: "Your account is not enabled for custom max steps yet. Join the beta program at /beta, then retry." } }, { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(runTinyFishAgent("https://example.com", "Inspect page")).rejects.toThrow("permission/entitlement error (FORBIDDEN). Custom step limits require TinyFish beta access");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([401, 400, 429, 500])("handles HTTP %i safely for every TinyFish endpoint", async (status) => {
    vi.stubEnv("TINYFISH_API_KEY", "test-only-placeholder");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: "PROVIDER_ERROR", message: "private credential and website content" } }, { status })));
    for (const call of [() => runTinyFishAgent("https://example.com", "Inspect"), () => fetchTinyFishCaptures("run-1")]) {
      const error = await call().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toContain("PROVIDER_ERROR");
        expect(error.message).not.toContain("private credential");
        expect(error.message).toContain(status === 401 ? "authentication" : status === 400 ? "invalid request" : status === 429 ? "rate limited" : "HTTP 500");
      }
    }
  });
  it("handles non-JSON permission errors without claiming a bad key", async () => {
    vi.stubEnv("TINYFISH_API_KEY", "test-only-placeholder");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("private HTML error", { status: 403 })));
    await expect(runTinyFishAgent("https://example.com", "Inspect")).rejects.toThrow("permission/entitlement error (UNKNOWN_ERROR)");
  });
});