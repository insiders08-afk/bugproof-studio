import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  ticket: z.string().min(1).max(4000),
  docsText: z.string().max(20000),
  verdict: z.string().max(40),
  evidence: z.array(z.string().max(1000)).max(30),
});

export type Analysis = {
  docsSource: string;
  docsExcerpt: string;
  expectedButton: string;
  narrative: string;
  nextSteps: string[];
  error?: string | undefined;
};

async function askAI(prompt: string): Promise<string> {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const apiKey = process.env['LOVABLE_API_KEY']!;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    prompt,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return await result.text;
}

export const analyzeInvestigation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<Analysis> => {
    let docs = data.docsText;
    let docsSource = "Built-in tutorial";
    let error: string | undefined;
    const prompt = `You are RealityGate's investigation planner. Reply with ONLY a JSON object:
{"expectedButton": string (exact UI button label the docs tell the user to click to start creating the resource; "Create Endpoint" if unclear),
 "narrative": string (3-4 sentences, cite evidence ids like [E2]; never claim anything not in the evidence),
 "nextSteps": string[] (3 concise engineering actions)}

Ticket: ${data.ticket}
Gate verdict (authoritative, do not contradict): ${data.verdict}
Documentation:
${docs.slice(0, 8000)}
Observed evidence:
${data.evidence.join("\n")}`;
    try {
      const text = await askAI(prompt);
      const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      return {
        docsSource,
        docsExcerpt: docs.slice(0, 1500),
        expectedButton: String(json.expectedButton || "Create Endpoint"),
        narrative: String(json.narrative || ""),
        nextSteps: Array.isArray(json.nextSteps) ? json.nextSteps.map(String).slice(0, 5) : [],
        error,
      };
    } catch (e) {
      return {
        docsSource,
        docsExcerpt: docs.slice(0, 1500),
        expectedButton: "Create Endpoint",
        narrative: "",
        nextSteps: [],
        error: [error, `AI analysis unavailable: ${e instanceof Error ? e.message : String(e)}`].filter(Boolean).join(" · "),
      };
    }
  });
