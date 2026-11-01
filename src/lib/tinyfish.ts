const AGENT_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";
const FETCH_URL = "https://api.fetch.tinyfish.ai";

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

export type TinyFishDocument = {
  url: string;
  finalUrl: string;
  title: string;
  text: string;
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

function apiError(status: number): string {
  if (status === 401 || status === 403) return "TinyFish rejected the configured credential or access permissions.";
  if (status === 429) return "TinyFish is rate limited. Wait before starting another test.";
  return `TinyFish service request failed (${status}). Try again later.`;
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
      body: JSON.stringify({ url, goal, agent_config: { max_steps: 30, max_duration_seconds: 180 },
        capture_config: { screenshots: true, snapshots: true, elements: true },
        ...(outputSchema ? { output_schema: outputSchema } : {}) }),
      signal: AbortSignal.timeout(210_000),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error(apiError(response.status)); }
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

export async function fetchTinyFishDocument(url: string): Promise<TinyFishDocument> {
  const response = await fetch(FETCH_URL, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: [url], format: "markdown" }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(apiError(response.status));
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") {
    throw new Error("TinyFish Fetch returned an invalid response");
  }

  const data = payload as {
    results?: Array<Record<string, unknown>>;
    errors?: unknown[];
  };
  const page = data.results?.[0];
  if (!page) {
    throw new Error("TinyFish could not fetch readable documentation.");
  }

  const text =
    typeof page["text"] === "string"
      ? page["text"]
      : typeof page["markdown"] === "string"
        ? page["markdown"]
        : typeof page["content"] === "string"
          ? page["content"]
          : "";

  if (!text.trim()) throw new Error("TinyFish fetched the documentation but returned no readable text");

  return {
    url: typeof page["url"] === "string" ? page["url"] : url,
    finalUrl: typeof page["final_url"] === "string" ? page["final_url"] : url,
    title: typeof page["title"] === "string" ? page["title"] : "",
    text: text.slice(0, 20_000),
  };
}

/** Retrieve actual provider artifacts; never expose API keys in image URLs. */
export async function fetchTinyFishCaptures(runId: string): Promise<Array<{ stepId: string; image: string; label: string }>> {
  if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error("Invalid TinyFish run identifier.");
  const response = await fetch(`https://agent.tinyfish.ai/v1/runs/${encodeURIComponent(runId)}?screenshots=base64&html=none`, {
    headers: { "X-API-Key": getApiKey() }, signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error(apiError(response.status)); }
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
