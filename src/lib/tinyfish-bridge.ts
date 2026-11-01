import { z } from "zod";
import { AgentResult, PublicUrl, StepObservation } from "@/lib/live-contract";
import type { TinyFishArtifacts } from "@/lib/tinyfish";

const core = AgentResult.pick({ outcome: true, final_url: true, page_title: true, expected_texts: true, final_text: true, summary: true, error: true });
const object = (v: unknown): Record<string, unknown> => {
  if (typeof v === "string") { try { return object(JSON.parse(v)); } catch { return {}; } }
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
};
const array = (v: unknown) => Array.isArray(v) ? v : [];

/** Native artifacts and structured conclusions remain separate sources. Never infer clicks from prose. */
export function bridgeTinyFish(result: unknown, artifacts?: TinyFishArtifacts) {
  const raw = object(result);
  const validation = core.safeParse(raw);
  const warnings: string[] = [];
  const issues: string[] = [];
  const steps = array(raw["steps"]).flatMap(s => {
    const parsed = StepObservation.safeParse(s);
    if (!parsed.success) { warnings.push("A structured action could not be decoded; native timeline retained."); return []; }
    return [parsed.data];
  }).slice(0, 30);
  const screenshots = array(raw["screenshots"]).flatMap(s => {
    const parsed = AgentResult.shape.screenshots.element.safeParse(s);
    if (!parsed.success) { warnings.push("A screenshot measurement could not be decoded."); return []; }
    return [parsed.data];
  }).slice(0, 20);
  const network = array(raw["network"]).flatMap(s => {
    const parsed = z.object({ url: PublicUrl, status: z.number().int().min(100).max(599), relevant: z.boolean() }).safeParse(s);
    if (!parsed.success) { warnings.push("An invalid network measurement was omitted."); return []; }
    return [parsed.data];
  }).slice(0, 30);
  const visibleErrors = array(raw["visible_errors"]).filter((s): s is string => typeof s === "string" && s.trim().length > 0 && s.length <= 1000).slice(0, 10);
  const nativeSteps = artifacts?.steps ?? [];
  const captures = nativeSteps.flatMap(s => s.image ? [{ stepId: s.stepId, image: s.image, label: s.label }] : []);
  if (!validation.success) issues.push("TinyFish returned an invalid outcome, final URL, final observation or success criteria.");
  if (validation.success && !validation.data.final_text.trim()) issues.push("No final-page observation was returned.");
  if (!nativeSteps.length) issues.push("No native TinyFish workflow steps were retrieved.");
  if (!captures.length) issues.push("No authenticated TinyFish screenshot artifacts were retrieved.");
  if (nativeSteps.some(s => ["FAILED", "CANCELLED"].includes(s.status))) issues.push("A native TinyFish step reported failure.");
  if (artifacts && artifacts.status !== "COMPLETED") issues.push("The native TinyFish run is not completed.");
  if (steps.some(s => !s.ok)) issues.push("A structured browser action reported failure.");
  if (!steps.length) warnings.push("Structured click targets are unavailable; native action descriptions are not executable replay instructions.");
  for (const capture of captures) {
    const measurement = screenshots.find(s => s.stepId === capture.stepId);
    if (!measurement?.readinessChecked) warnings.push(`Photo readiness not measured for native step ${capture.stepId}.`);
    else if (measurement.photos.pending > 0 || measurement.photos.broken > 0) warnings.push(`Photos at step ${capture.stepId}: ${measurement.photos.pending} pending, ${measurement.photos.broken} unavailable.`);
  }
  if (!network.length) warnings.push("HTTP status was not measured; no status was invented.");
  return { observation: validation.success ? { ...validation.data, steps, screenshots, network, visible_errors: visibleErrors } : undefined,
    nativeSteps, captures, warnings: [...new Set(warnings)], issues };
}

export const LIVE_OUTPUT_SCHEMA = {
  type: "object", required: ["outcome", "final_url", "expected_texts", "final_text"],
  properties: {
    outcome: { type: "string", enum: ["success", "failure", "blocked", "incomplete", "unknown"] },
    final_url: { type: "string" }, page_title: { type: "string" }, summary: { type: "string" },
    expected_texts: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 10 },
    final_text: { type: "string", description: "Actual visible final-page text, quoted verbatim rather than a workflow summary." },
    visible_errors: { type: "array", items: { type: "string" } }, error: { type: "string" },
    steps: { type: "array", items: { type: "object", required: ["action", "targetVisible", "beforeText", "afterText", "ok"], properties: {
      action: { anyOf: [
        { type: "object", required: ["type", "text"], properties: { type: { const: "click" }, text: { type: "string" } } },
        { type: "object", required: ["type", "label", "text"], properties: { type: { const: "fill" }, label: { type: "string" }, text: { type: "string" } } },
        { type: "object", required: ["type", "key"], properties: { type: { const: "press" }, key: { enum: ["Enter", "Tab", "Escape", "ArrowDown", "ArrowUp"] } } },
        { type: "object", required: ["type", "direction"], properties: { type: { const: "scroll" }, direction: { enum: ["up", "down"] } } },
        { type: "object", required: ["type", "milliseconds"], properties: { type: { const: "wait" }, milliseconds: { type: "integer", minimum: 250, maximum: 5000 } } },
      ] }, targetVisible: { type: "boolean" }, beforeText: { type: "string" }, afterText: { type: "string" }, ok: { type: "boolean" }, error: { type: "string" },
    } } },
    screenshots: { type: "array", items: { type: "object", required: ["label", "photos", "readinessChecked"], properties: {
      stepId: { type: "string", description: "Native provider step identifier, only if known." }, label: { type: "string" }, readinessChecked: { type: "boolean" },
      photos: { type: "object", required: ["total", "loaded", "pending", "broken"], properties: {
        total: { type: "integer", minimum: 0 }, loaded: { type: "integer", minimum: 0 }, pending: { type: "integer", minimum: 0 }, broken: { type: "integer", minimum: 0 },
      } },
    } } },
    network: { type: "array", items: { type: "object", required: ["url", "status", "relevant"], properties: {
      url: { type: "string" }, status: { type: "integer", minimum: 100, maximum: 599 }, relevant: { type: "boolean" },
    } } },
  },
};