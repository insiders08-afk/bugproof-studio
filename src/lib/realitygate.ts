// RealityGate live verdict: TinyFish reports what it did; the gateway decides PASS/FAILED.

export type EvidenceKind = "action" | "dom" | "network" | "screenshot";

// ---------- Live website testing (any URL) ----------

export type LiveVerdict = "PASS" | "FAILED" | "APPLICATION_BUG" | "INCONCLUSIVE";
export type RequirementMet = "yes" | "no" | "unknown";

export type LiveEvidence = { id: string; kind: EvidenceKind; label: string; detail: string; ok: boolean; screenshot?: string };

export type LiveObservation = {
  statusCode: number | null;
  scrapeError?: string | undefined;
  actionsError?: string | undefined;
  pageText: string;
  expectedTexts: string[];
  forbiddenTexts: string[];
  agentOutcome?: "success" | "failure" | "blocked" | "incomplete" | "unknown";
  /** TinyFish's explicit answer: does the website satisfy the user's requirement? */
  requirementMet?: RequirementMet;
  /** TinyFish run lifecycle status (e.g. COMPLETED). When given, anything else is inconclusive. */
  runStatus?: string;
  evidenceIssues?: string[];
};

/**
 * Gateway: TinyFish completing a run is not the same as the requirement passing.
 * PASS needs a completed run, outcome success AND requirement met = yes.
 * FAILED when TinyFish checked the requirement and it was not met (or the test failed).
 * Everything else, including contradictions, is INCONCLUSIVE.
 */
export function liveGate(o: LiveObservation): { verdict: LiveVerdict; confidence: number; found: string[]; missing: string[]; errorsSeen: string[]; reason: string } {
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
  const text = normalize(o.pageText);
  const found = o.expectedTexts.filter((value) => normalize(value) && text.includes(normalize(value)));
  const missing = o.expectedTexts.filter((value) => !normalize(value) || !text.includes(normalize(value)));
  const errorsSeen = o.forbiddenTexts.filter((value) => normalize(value) && text.includes(normalize(value)));
  // Numeric confidence is kept for historical report compatibility only.
  const result = (verdict: LiveVerdict, confidence: number, reason: string) => ({ verdict, confidence, found, missing, errorsSeen, reason });
  if (o.runStatus !== undefined && o.runStatus !== "COMPLETED") return result("INCONCLUSIVE", 0, `TinyFish run ended as ${o.runStatus}, so the requirement could not be judged.`);
  const met = o.requirementMet ?? "unknown";
  const outcome = o.agentOutcome ?? "unknown";
  if (outcome === "success" || outcome === "failure") {
    if (met === "yes" && outcome === "success") return result("PASS", 1, "TinyFish completed the run and confirmed the requirement works.");
    if (met === "no") return result("FAILED", 1, "TinyFish completed the run and found the requirement is not met.");
    if (outcome === "failure" && met === "unknown") return result("FAILED", 1, "TinyFish reported the requested test failed.");
    if (met === "unknown") return result("INCONCLUSIVE", 0, "TinyFish finished but did not confirm whether the requirement was met.");
    return result("INCONCLUSIVE", 0, "TinyFish's outcome and requirement check contradict each other.");
  }
  return result("INCONCLUSIVE", 0, `TinyFish could not finish the check (${outcome}).`);
}
