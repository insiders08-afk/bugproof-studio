const AGENT_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";
const FETCH_URL = "https://api.fetch.tinyfish.ai";

export type TinyFishEvent = Record<string, unknown> & {
  type?: string;
  status?: string;
};

export type TinyFishAgentRun = {
  runId?: string;
  status: string;
  result: unknown;
  streamingUrl?: string;
  events: TinyFishEvent[];
};

export type TinyFishDocument = {
  url: string;
  finalUrl: string;
  title: string;
  text: string;
};

function getApiKey(): string {
  const key = process.env.TINYFISH_API_KEY?.trim();
  if (!key || key === "YOUR_TINYFISH_API_KEY_HERE") {
    throw new Error("TinyFish is not configured. Set TINYFISH_API_KEY in your server environment.");
  }
  return key;
}

async function readError(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return body.slice(0, 800) || response.statusText || "Unknown TinyFish API error";
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

export async function runTinyFishAgent(url: string, goal: string): Promise<TinyFishAgentRun> {
  const response = await fetch(AGENT_URL, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ url, goal }),
    signal: AbortSignal.timeout(240_000),
  });

  if (!response.ok) {
    throw new Error(`TinyFish Agent API [${response.status}]: ${await readError(response)}`);
  }
  if (!response.body) throw new Error("TinyFish Agent returned no event stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: TinyFishEvent[] = [];
  let buffer = "";
  let complete: TinyFishEvent | undefined;
  let streamingUrl: string | undefined;

  const consume = (block: string) => {
    const event = parseTinyFishSseBlock(block);
    if (!event) return;
    events.push(event);
    if (event.type === "STREAMING_URL" && typeof event.streaming_url === "string") {
      streamingUrl = event.streaming_url;
    }
    if (event.type === "COMPLETE") complete = event;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) consume(block);
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
  } finally {
    reader.releaseLock();
  }

  if (!complete) throw new Error("TinyFish stream ended before a COMPLETE event");
  const status = typeof complete.status === "string" ? complete.status : "UNKNOWN";
  if (status !== "COMPLETED") {
    const errorValue = complete.error;
    const message =
      errorValue && typeof errorValue === "object" && "message" in errorValue
        ? String((errorValue as { message?: unknown }).message ?? status)
        : typeof errorValue === "string"
          ? errorValue
          : status;
    throw new Error(`TinyFish Agent run ${status}: ${message}`);
  }

  return {
    runId: typeof complete.run_id === "string" ? complete.run_id : undefined,
    status,
    result: complete.result,
    streamingUrl,
    events,
  };
}

export async function fetchTinyFishDocument(url: string): Promise<TinyFishDocument> {
  const response = await fetch(FETCH_URL, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: [url], format: "markdown" }),
    signal: AbortSignal.timeout(150_000),
  });

  if (!response.ok) {
    throw new Error(`TinyFish Fetch API [${response.status}]: ${await readError(response)}`);
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
    const reason = data.errors?.length ? JSON.stringify(data.errors[0]) : "No result returned";
    throw new Error(`TinyFish could not fetch the documentation: ${reason.slice(0, 500)}`);
  }

  const text =
    typeof page.text === "string"
      ? page.text
      : typeof page.markdown === "string"
        ? page.markdown
        : typeof page.content === "string"
          ? page.content
          : "";

  if (!text.trim()) throw new Error("TinyFish fetched the documentation but returned no readable text");

  return {
    url: typeof page.url === "string" ? page.url : url,
    finalUrl: typeof page.final_url === "string" ? page.final_url : url,
    title: typeof page.title === "string" ? page.title : "",
    text: text.slice(0, 20_000),
  };
}
