// RealityGate live verdict: maps TinyFish's explicit test outcome.

export type EvidenceKind = "action" | "dom" | "network" | "screenshot";

// ---------- Live website testing (any URL) ----------

export type LiveVerdict = "PASS" | "FAILED" | "APPLICATION_BUG" | "INCONCLUSIVE";

export type LiveEvidence = { id: string; kind: EvidenceKind; label: string; detail: string; ok: boolean; screenshot?: string };

export type LiveObservation = {
  statusCode: number | null;
  scrapeError?: string | undefined;
  actionsError?: string | undefined;
  pageText: string;
  expectedTexts: string[];
  forbiddenTexts: string[];
  agentOutcome?: "success" | "failure" | "blocked" | "incomplete" | "unknown";
  evidenceIssues?: string[];
};

/** Map TinyFish's explicit test outcome only; measurements are informational, not vetoes. */
export function liveGate(o: LiveObservation): { verdict: LiveVerdict; confidence: number; found: string[]; missing: string[]; errorsSeen: string[] } {
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
  const text = normalize(o.pageText);
  const found = o.expectedTexts.filter((value) => normalize(value) && text.includes(normalize(value)));
  const missing = o.expectedTexts.filter((value) => !normalize(value) || !text.includes(normalize(value)));
  const errorsSeen = o.forbiddenTexts.filter((value) => normalize(value) && text.includes(normalize(value)));
  const result = (verdict: LiveVerdict, confidence: number) => ({ verdict, confidence, found, missing, errorsSeen });
  // Retain the numeric field for historical report compatibility, not as measured confidence.
  if (o.agentOutcome === "success") return result("PASS", 1);
  if (o.agentOutcome === "failure") return result("FAILED", 1);
  return result("INCONCLUSIVE", 0);
}
