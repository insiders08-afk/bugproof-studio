import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  ticket: z.string().min(1).max(4000),
  verdict: z.string().max(40),
  evidence: z.array(z.string().max(1000)).max(30),
});

export type Analysis = {
  narrative: string;
  nextSteps: string[];
  error?: string | undefined;
};

async function askAI(prompt: string): Promise<string> {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const apiKey = process.env["LOVABLE_API_KEY"]!;
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
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<Analysis> => {
    const prompt = `You are RealityGate's investigation planner. Reply with ONLY a JSON object:
{"narrative": string (3-4 sentences, cite evidence ids like [E2]; never claim anything not in the evidence),
 "nextSteps": string[] (3 concise engineering actions)}

Ticket: ${data.ticket}
Gate verdict (authoritative, do not contradict): ${data.verdict}
Observed evidence:
${data.evidence.join("\n")}`;
    try {
      const text = await askAI(prompt);
      const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      return {
        narrative: String(json.narrative || ""),
        nextSteps: Array.isArray(json.nextSteps) ? json.nextSteps.map(String).slice(0, 5) : [],
      };
    } catch (e) {
      return {
        narrative: "",
        nextSteps: [],
        error: `AI analysis unavailable: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  });
