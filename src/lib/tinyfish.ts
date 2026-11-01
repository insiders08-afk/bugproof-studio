const AGENT_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

export type TinyFishEvent = Record<string, unknown> & {
  type?: string;
  status?: string;
};

export type TinyFishAgentRun = {
  runId?: string | undefined;
  status: string;
  result: unknown;
  streamingUrl?: string | undefined;
  events: TinyFishEvent[];
};

function getApiKey(): string {
  const key = process.env["TINYFISH_API_KEY"]?.trim();
  if (!key || key === "YOUR_TINYFISH_API_KEY_HERE") {
    throw new Error("TinyFish is not configured. Set TINYFISH_API_KEY in your server environment.");
  }
  return key;
}

export class TinyFishRunError extends Error {
  constructor(message: string, public run: TinyFishAgentRun) { super(message); this.name = "TinyFishRunError"; }
}

async function apiError(response: Response): Promise<string> {
  const status = response.status;
  let code = "UNKNOWN_ERROR";
  let detail = "";
  const reader = response.body?.getReader();
  if (reader) {
    try {
      const decoder = new TextDecoder();
      let raw = "";
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 16_000) break;
        raw += decoder.decode(value, { stream: true });
      }
      const payload: unknown = JSON.parse(raw + decoder.decode());
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const outer = payload as Record<string, unknown>;
        const candidate = outer["error"] ?? outer;
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
          const error = candidate as Record<string, unknown>;
          if (typeof error["code"] === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(error["code"])) code = error["code"];
          // Only expose recognized capability diagnostics, never arbitrary provider/page content.
          const message = typeof error["message"] === "string" ? error["message"] : "";
          if (/not enabled for custom max steps/i.test(message)) detail = " Custom step limits require TinyFish beta access.";
          else if (/element/i.test(message) && /not enabled|beta|entitlement|access/i.test(message)) detail = " Element capture requires additional TinyFish account access.";
        }
      }
    } catch { /* Non-JSON or oversized error bodies use safe status diagnostics. */ }
    finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  if (status === 401) return `TinyFish authentication failed (${code}). Check the configured API key.`;
  if (status === 403) return `TinyFish permission/entitlement error (${code}).${detail || " Check account access and requested capabilities."}`;
  if (status === 400) return `TinyFish invalid request (${code}). Check the requested settings.`;
  if (status === 429) return `TinyFish is rate limited (${code}). Wait before starting another test.`;
  return `TinyFish API error HTTP ${status} (${code}). Try again later.`;
}

/** Parse one SSE event block. TinyFish sends JSON in one or more data: lines. */
export function parseTinyFishSseBlock(block: string): TinyFishEvent | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data || data === "[DONE]") return null;

  const parsed: unknown = JSON.parse(data);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("TinyFish returned an invalid SSE event");
  }
  return parsed as TinyFishEvent;
}

export async function runTinyFishAgent(url: string, goal: string, outputSchema?: Record<string, unknown>): Promise<TinyFishAgentRun> {
  const run: TinyFishAgentRun = { status: "NOT_STARTED", result: null, events: [] };
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    // Never automatically retry POST: a lost response may already have started a billable browser run.
    const response = await fetch(AGENT_URL, {
      method: "POST",
      headers: { "X-API-Key": getApiKey(), "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ url, goal, agent_config: { max_duration_seconds: 180 },
        capture_config: { screenshots: true },
        ...(outputSchema ? { output_schema: outputSchema } : {}) }),
      signal: AbortSignal.timeout(210_000),
    });
    if (!response.ok) throw new Error(await apiError(response));
    if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) throw new Error("TinyFish did not return an event stream.");
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let complete = false;
    const consume = (block: string) => {
      const event = parseTinyFishSseBlock(block);
      if (!event) return;
      // Keep only bounded diagnostics, not arbitrary page/credential-bearing event payloads.
      if (run.events.length < 100) run.events.push({ ...(event.type ? { type: event.type } : {}), ...(event.status ? { status: event.status } : {}) });
      if (typeof event["run_id"] === "string") run.runId = event["run_id"];
      if (event.type === "STARTED") run.status = "RUNNING";
      if (event.type === "STREAMING_URL" && typeof event["streaming_url"] === "string" && event["streaming_url"].startsWith("https://")) run.streamingUrl = event["streaming_url"];
      if (event.type === "COMPLETE") {
        complete = true;
        run.status = typeof event.status === "string" ? event.status : "UNKNOWN";
        run.result = event["result"] ?? null;
      }
    };
    while (!complete) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 2_000_000) throw new Error("TinyFish event exceeded the safe response size.");
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) { consume(block); if (complete) break; }
      if (done) { if (!complete && buffer.trim()) consume(buffer); break; }
    }
    if (!complete) throw new Error("TinyFish disconnected before completion; the remote run may still be active.");
    if (run.status !== "COMPLETED") throw new Error(`TinyFish run ${run.status}. Review the saved run identifier before retrying.`);
    return run;
  } catch (error) {
    const message = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
      ? "TinyFish timed out; the remote run may still be active. Do not immediately repeat the test."
      : error instanceof SyntaxError ? "TinyFish returned a malformed event stream."
      : error instanceof Error ? error.message : "TinyFish investigation failed.";
    throw new TinyFishRunError(message, run);
  } finally {
    if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}

/** Retrieve actual provider artifacts; never expose API keys in image URLs. */
export async function fetchTinyFishCaptures(runId: string): Promise<Array<{ stepId: string; image: string; label: string }>> {
  if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error("Invalid TinyFish run identifier.");
  const response = await fetch(`https://agent.tinyfish.ai/v1/runs/${encodeURIComponent(runId)}?screenshots=base64&html=none`, {
    headers: { "X-API-Key": getApiKey() }, signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(await apiError(response));
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No capture response returned.");
  let raw = ""; let bytes = 0; const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8_000_000) throw new Error("Screenshot response exceeds the report size limit.");
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const payload: unknown = JSON.parse(raw);
  if (!payload || typeof payload !== "object" || !("steps" in payload) || !Array.isArray(payload.steps)) throw new Error("Invalid capture response.");
  return payload.steps.slice(-12).flatMap((step: unknown) => {
    if (!step || typeof step !== "object") return [];
    const s = step as Record<string, unknown>;
    if (typeof s["id"] !== "string" || typeof s["screenshot"] !== "string" || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s["screenshot"])) return [];
    return [{ stepId: s["id"], image: s["screenshot"], label: typeof s["action"] === "string" ? s["action"].slice(0, 500) : "Browser step" }];
  });
}
