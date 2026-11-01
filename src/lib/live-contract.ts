import { z } from "zod";
import { BrowserAction, type Action } from "@/lib/live-browser";

/** Reject local/private destinations before sending anything to a remote browser. */
export function publicWebUrl(value: string): boolean {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    if (!/^https?:$/.test(u.protocol) || u.username || u.password || (u.port && !["80", "443"].includes(u.port))) return false;
    if (!host.includes(".") || host.includes(":") || /(?:^|\.)(localhost|local|internal|lan|test|invalid)$/.test(host)) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b] = host.split(".").map(Number);
      if (a === undefined || b === undefined || a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))) return false;
    }
    return true;
  } catch { return false; }
}
export const PublicUrl = z.string().url().max(2000).refine(publicWebUrl, "Use a public HTTP or HTTPS website without credentials or custom ports");
const text = z.string().trim().min(1).max(1000);
export const StepObservation = z.object({
  action: BrowserAction,
  targetVisible: z.boolean(),
  beforeText: z.string().max(16000),
  afterText: z.string().max(16000),
  ok: z.boolean(),
  error: z.string().max(1000).optional(),
});
export const PhotoObservation = z.object({ total: z.number().int().min(0), loaded: z.number().int().min(0), pending: z.number().int().min(0), broken: z.number().int().min(0) }).refine(p => p.total === p.loaded + p.pending + p.broken, "Photo counts must add up");
export const AgentResult = z.object({
  outcome: z.enum(["success", "failure", "blocked", "incomplete", "unknown"]),
  summary: z.string().max(4000).default(""),
  final_url: PublicUrl,
  page_title: z.string().max(500).default(""),
  expected_texts: z.array(text).min(1).max(10),
  final_text: z.string().max(30000),
  visible_errors: z.array(text).max(10).default([]),
  steps: z.array(StepObservation).max(30),
  screenshots: z.array(z.object({ url: z.string().url().refine(v => v.startsWith("https://")).optional(), stepId: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(), label: text, photos: PhotoObservation, readinessChecked: z.boolean() })).max(20),
  network: z.array(z.object({ url: PublicUrl, status: z.number().int().min(100).max(599), relevant: z.boolean() })).max(30).default([]),
  error: z.string().max(1000).default(""),
});
export type AgentObservation = z.infer<typeof AgentResult>;
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export function safeObservedAction(step: z.infer<typeof StepObservation>): boolean {
  if (!step.ok || !step.targetVisible) return false;
  const action = step.action;
  if (action.type === "click" || action.type === "fill") {
    const target = action.type === "click" ? action.text : action.label;
    if (!normalize(step.beforeText).includes(normalize(target))) return false;
    if (/\b(pay|purchase|confirm booking|place order|delete|send message|submit payment|complete booking)\b/i.test(target)) return false;
  }
  return true;
}
export function replayActions(result: AgentObservation): Action[] {
  return result.steps.filter(safeObservedAction).map(s => s.action);
}
export function observationIssues(result: AgentObservation): string[] {
  const issues: string[] = [];
  if (result.steps.some(s => !safeObservedAction(s))) issues.push("A browser action failed, was unsafe, or lacked visible-target evidence.");
  if (!result.screenshots.length) issues.push("No screenshot evidence was returned.");
  if (result.screenshots.some(s => !s.readinessChecked || s.photos.pending > 0)) issues.push("Photo readiness was not verified for every screenshot.");
  if (!result.final_text.trim()) issues.push("No final-page text was returned.");
  return issues;
}