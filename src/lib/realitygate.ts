// Core RealityGate domain: sandbox target simulation, evidence gate, verdict, test recipes.

export type Scenario = "bug" | "drift" | "repaired";

export const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "bug", label: "Application Bug", hint: "Button exists, but POST /api/webhooks returns 500" },
  { id: "drift", label: "Documentation Drift", hint: "Button was renamed to “Add Destination”; save works" },
  { id: "repaired", label: "Repaired", hint: "Tutorial matches UI and save succeeds" },
];

export const DEFAULT_TICKET =
  "I can't create a webhook. The tutorial says to click Create Endpoint but nothing happens.";

export const DEFAULT_TUTORIAL = `# Creating a webhook
1. Open Settings → Developers → Webhooks.
2. Click **Create Endpoint**.
3. Enter your URL, e.g. https://example.com/hook
4. Click **Save**. The endpoint appears in the list with status "Active".`;

export type EvidenceKind = "action" | "dom" | "network" | "screenshot";
export type Evidence = {
  id: string;
  kind: EvidenceKind;
  label: string;
  detail: string;
  ok: boolean;
  snapshot?: TargetSnapshot;
};

export type TargetSnapshot = {
  buttonLabel: string;
  formOpen: boolean;
  url: string;
  banner?: { tone: "error" | "success"; text: string };
  rows: string[];
};

export type SandboxRun = { scenario: Scenario; evidence: Evidence[] };

/** Behaviour of the built-in target app per scenario. Shared by /sandbox and the investigator. */
export function targetBehaviour(s: Scenario) {
  return {
    buttonLabel: s === "drift" ? "Add Destination" : "Create Endpoint",
    saveStatus: s === "bug" ? 500 : 201,
    saveBody:
      s === "bug"
        ? '{"error":"TypeError: Cannot read properties of undefined (reading \'secret\')"}'
        : '{"id":"wh_8f2","status":"Active"}',
  };
}

/** Deterministically drive the sandbox target following the tutorial's steps. */
export function runSandbox(s: Scenario, expectedButton = "Create Endpoint"): SandboxRun {
  const b = targetBehaviour(s);
  const url = "https://example.com/hook";
  const base: TargetSnapshot = { buttonLabel: b.buttonLabel, formOpen: false, url: "", rows: [] };
  const ev: Evidence[] = [];
  let n = 0;
  const push = (e: Omit<Evidence, "id">) => ev.push({ id: `E${++n}`, ...e });

  push({ kind: "action", label: "Navigate to /settings/webhooks", detail: "HTTP 200, page rendered", ok: true, snapshot: base });
  const found = b.buttonLabel === expectedButton;
  push({
    kind: "dom",
    label: `Locate button “${expectedButton}”`,
    detail: found
      ? `Found <button>${b.buttonLabel}</button>`
      : `0 matches. Closest candidate: <button>${b.buttonLabel}</button>`,
    ok: found,
    snapshot: base,
  });
  if (!found) {
    push({ kind: "action", label: `Fallback: click “${b.buttonLabel}”`, detail: "Form opened", ok: true, snapshot: { ...base, formOpen: true } });
  } else {
    push({ kind: "action", label: `Click “${expectedButton}”`, detail: "Form opened", ok: true, snapshot: { ...base, formOpen: true } });
  }
  push({ kind: "action", label: `Fill URL = ${url}`, detail: "input[name=url] value set", ok: true, snapshot: { ...base, formOpen: true, url } });
  const ok = b.saveStatus < 400;
  push({
    kind: "network",
    label: `POST /api/webhooks → ${b.saveStatus}`,
    detail: b.saveBody,
    ok,
  });
  push({
    kind: "screenshot",
    label: ok ? "Endpoint row visible, status Active" : "Error banner shown, list empty",
    detail: ok ? 'DOM: <tr>https://example.com/hook · Active</tr>' : 'DOM: <div role="alert">Something went wrong</div>',
    ok,
    snapshot: ok
      ? { ...base, url, banner: { tone: "success", text: "Endpoint created" }, rows: [`${url} · Active`] }
      : { ...base, formOpen: true, url, banner: { tone: "error", text: "Something went wrong" }, rows: [] },
  });
  return { scenario: s, evidence: ev };
}

export type Verdict = "APPLICATION_BUG" | "DOCUMENTATION_DRIFT" | "NOT_REPRODUCED" | "INCONCLUSIVE";

export type Scorecard = {
  verdict: Verdict;
  confidence: number;
  facts: string[];
  inferences: string[];
  unknowns: string[];
};

/** Evidence Gate: verdict is derived only from observed evidence, never from AI opinion. */
export function evidenceGate(evidence: Evidence[]): Scorecard {
  const dom = evidence.find((e) => e.kind === "dom");
  const net = evidence.find((e) => e.kind === "network");
  const shot = evidence.find((e) => e.kind === "screenshot");
  const facts = evidence.map((e) => `[${e.id}] ${e.label} — ${e.detail}`);
  if (!dom || !net || !shot) {
    return { verdict: "INCONCLUSIVE", confidence: 0.2, facts, inferences: [], unknowns: ["Missing DOM, network or visual evidence"] };
  }
  const status = Number(net.label.match(/→ (\d{3})/)?.[1] ?? 0);
  if (status >= 500 || (status >= 400 && !shot.ok)) {
    return {
      verdict: "APPLICATION_BUG",
      confidence: dom.ok ? 0.95 : 0.8,
      facts,
      inferences: ["Server rejected a valid request; failure is in the application, not the instructions"],
      unknowns: ["Root cause inside the server handler", "Whether other webhook URLs are affected"],
    };
  }
  if (!dom.ok && shot.ok) {
    return {
      verdict: "DOCUMENTATION_DRIFT",
      confidence: 0.9,
      facts,
      inferences: ["The workflow works but the tutorial references an outdated UI label"],
      unknowns: ["When the label changed", "Whether other tutorials reference the old label"],
    };
  }
  return {
    verdict: "NOT_REPRODUCED",
    confidence: 0.85,
    facts,
    inferences: ["Tutorial steps complete successfully against the live target"],
    unknowns: ["User's environment, account permissions or browser"],
  };
}

export function playwrightRecipe(button: string): string {
  return `import { test, expect } from "@playwright/test";

// Guardrail generated by RealityGate from a confirmed APPLICATION_BUG.
test("creating a webhook endpoint succeeds", async ({ page }) => {
  await page.goto("/settings/webhooks");
  await page.getByRole("button", { name: "${button}" }).click();
  await page.getByLabel("Endpoint URL").fill("https://example.com/hook");

  const save = page.waitForResponse((r) =>
    r.url().endsWith("/api/webhooks") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save" }).click();

  expect((await save).status()).toBeLessThan(400);
  await expect(page.getByRole("row", { name: /example\\.com\\/hook.*Active/ })).toBeVisible();
});`;
}

export type ReplayStep = { name: string; pass: boolean; detail: string };

/** Replay the guardrail test against the sandbox in a given scenario. */
export function replayGuardrail(s: Scenario, button = "Create Endpoint"): ReplayStep[] {
  const b = targetBehaviour(s);
  const steps: ReplayStep[] = [{ name: "goto /settings/webhooks", pass: true, detail: "200" }];
  const found = b.buttonLabel === button;
  steps.push({ name: `click button “${button}”`, pass: found, detail: found ? "clicked" : "locator resolved to 0 elements" });
  if (!found) return steps;
  steps.push({ name: "fill Endpoint URL", pass: true, detail: "https://example.com/hook" });
  const ok = b.saveStatus < 400;
  steps.push({ name: "expect POST /api/webhooks < 400", pass: ok, detail: `received ${b.saveStatus}` });
  if (!ok) return steps;
  steps.push({ name: "expect row Active visible", pass: true, detail: "visible" });
  return steps;
}
