# TinyShark: evidence-backed QA, three-phase implementation plan

## Architecture (preserved)
```text
USER / CI / DEVELOPER PROMPT
             |
             v
PHASE 1: DUAL-ENGINE EXPLORATION & TRUTH GATEWAY
TinyFish discovery -> selective evidence + private artifacts -> truth arbitration
             |
             v
PHASE 2: PREDICTIVE SEMANTIC ACTION COMPILER
State-transition graph -> adaptive locators -> independently validated Playwright
             |
             v
PHASE 3: CONTINUOUS VERIFICATION & EVIDENCE SUITE
Deterministic CI -> four-dimensional diffs -> visible flakiness management
```

TinyFish remains the discovery browser. AI explains supplied evidence; it cannot override verdicts. Repeat test remains a fresh investigation until independently validated replay exists. No simulated data, no new rate limits, no guaranteed speedups.

## Phase 1 — Dual-Engine Hardening & Truth Arbitration
**Goal:** trustworthy execution and requirement results, bounded investigations, selective evidence, secure artifacts, and measured reduction in finalization overhead.

### 1.1 Multi-signal readiness and selective capture
- Replace universal hydration flags with application-specific readiness signals, Playwright actionability, visible loading indicators, and post-action transition verification. Framework hydration cannot be inferred universally.
- Correlate current actions with relevant requests/responses; ignore analytics, polling and unrelated background traffic. Independently verify resulting UI state; never use global network-idle as a universal readiness gate.
- Capture before/after snapshots at meaningful transitions and failures, relevant DOM/ARIA fragments, target visibility/enabled state/bounds, console errors/page exceptions, correlated request/response metadata, navigation and DOM mutation events. Never claim unavailable signals were measured.
- Respect provider capabilities: TinyFish owns remote execution. Request supported observations in its output contract; label these provider-reported. Locally enforce readiness/actionability only in code actually executed by Playwright. Native descriptions cannot become guessed executable actions.

### 1.2 Faster private artifact pipeline and progress
- Upload captures with bounded concurrency below runtime limits, stable paths, retry-safe finalization and an expiring owner-scoped lease.
- Surface native progress through existing owner-authenticated polling where returned. Do not open a second billable run or invent intermediate events. Durable streaming is conditional on a provider event subscription that can resume an existing run.
- Retain original capture dimensions. WebP previews require a compatible image-processing service; do not relabel bytes, distort coordinate mappings, or promise unsupported server image processing.
- Record provider/finalization/upload/report timings, artifact counts and limitations for benchmarking. Preserve recovery after navigation and interrupted finalization.

### 1.3 Truth arbitration, no-progress detection and security
- Store independent executionStatus, requirementVerdict and nullable failureClass. A completed investigation is not automatically a passing requirement. Expected negative behaviour may satisfy an explicitly negative requirement. A failed requirement is not proof of a regression.
- Execution: COMPLETED / BLOCKED / TIMED_OUT / INFRA_ERROR / CANCELLED.
- Requirement: PASS / FAIL / INCONCLUSIVE / NOT_EVALUATED.
- Failure class: APP_REGRESSION / EXPECTED_NEGATIVE / AUTH_FAILURE / BOT_CHALLENGE / TEST_FAILURE / INFRA_FAILURE. Unknown causes remain null. APP_REGRESSION requires verified baseline/expectation evidence, not just a 5xx.
- Detect repeated state + same action + no progress using recent history, not URL revisits alone. Bound duration, actions, recovery attempts and model calls where the runner exposes enforcement; distinguish prompt guidance from hard limits.
- Redact tokens, credentials, personal information and sensitive URL parameters before persistence, AI summaries and exports. Do not retain raw request headers/bodies. Block credentials in prompts/URLs.
- Screenshots need pixel-aware redaction to guarantee sanitization. Until available, withhold captures when sensitive context is detected; explicitly record that this is not certified pixel sanitization.
- Preserve private artifacts and owner-only access, validate every signed path, isolate each investigation/browser session, forbid unapproved login/CAPTCHA bypass and irreversible actions. Do not accept saved authentication material until encrypted storage and verified provider injection are available.
- Historical reports remain unchanged and labelled Legacy; retain legacy verdict fields for compatibility.

**Acceptance:** table-driven classification tests; false-pass/contradiction cases; no-progress and legitimate revisits; credential redaction/rejection; owner-path isolation; bounded concurrent uploads; navigation recovery; one real signed-in investigation and report readback where access permits. Document unavailable TinyFish telemetry, cancellation, session injection and hard model/action limits instead of fabricating enforcement.

## Phase 2 — Semantic State Graph & Self-Healing Compiler
**Goal:** turn discovery into versioned, independently validated regression recipes.

### 2.1 Rich transition extraction and workflow versioning
```typescript
interface StateTransition {
  id: string;
  preconditions: { urlPattern?: string; semanticState?: string; requiredElements?: SemanticTarget[] };
  target: SemanticTarget;
  action: { type: "click" | "fill" | "press" | "select" | "scroll"; value?: string };
  expectedPostconditions: { urlPattern?: string; requiredElements?: SemanticTarget[]; dismissedElements?: SemanticTarget[]; networkAssertions?: NetworkAssertion[] };
  recoveryPolicy: { allowedStrategies: string[]; maxAttempts: number; requiresApproval?: boolean };
  confidence: number;
  evidenceReferences: string[];
  recipeVersion: string;
}
```
- Label trace entries exploration, confirmed action, assertion, branch, recovery or failed attempt. Preserve meaningful alternative paths. Remove irrelevant steps only after workflow validation.
- Every version retains version ID, original discovery trace, compiled graph, previous version, healing changes, validation results and evidence references. Preserve rollback and original failures.

### 2.2 Adaptive locators and embedded controls
- Context-dependent candidates: role + accessible name; label/placeholder; explicit test ID; contextual anchor; distinctive text; carefully validated CSS/XPath. Controlled apps may prefer test IDs; third-party sites generally prefer semantics. Reject dynamic class guesses.
- Every resolution must pass uniqueness, context, visibility and actionability checks. Never select the first ambiguous match.
- Support open Shadow DOM, nested/permitted cross-origin frame targeting, frame navigation/detachment. Closed roots, canvas/WebGL and inaccessible controls may need explicitly bounded vision fallback; embedded widgets are not automatically visual-only.

### 2.3 Controlled healing and independent replay validation
- Independently replay compiled recipes before publishing. Successful discovery alone never certifies a regression test.
- Never silently alter assertions, choose ambiguous targets, turn unexpected errors into passes, or retry destructive actions without idempotency protection.
- Bound recovery; save repairs as new versions, preserve failing evidence, require approval for risky repairs, and support rollback.
- Deterministic replay uses no LLM/vision unless recovery is explicitly enabled. Use relevant response/state waits, not global network-idle. Measure speed rather than guaranteeing 4–8 seconds.

**Acceptance:** semantic-target fixtures, frames/shadow fixtures, preserved branches, ambiguous/destructive refusal, immutable assertions, independent replay, version/rollback tests and evidence lineage.

## Phase 3 — Continuous Verification & CI Engine
**Goal:** trustworthy regression monitoring, authenticated suites and measurable performance.

### 3.1 Four-dimensional regression diffing and flakiness
- Visual: layout shifts, missing UI, overlays. Semantic: changed names/roles and missing controls. Network: relevant failed requests/response changes. Behavioural: transition/outcome changes.
- Compare to explicit expectations, not arbitrary screenshot/text differences. Handle dynamic content and approved baseline updates with evidence.
- Historical pass/fail rates, failure clustering, repeated-run analysis, infrastructure/application separation and visible quarantine. Quarantined never means passed.

### 3.2 Expanded encrypted session vault
- Extend Phase 1 security with cookies/localStorage, optional IndexedDB, separately handled sessionStorage, expiry detection, authorized reauthentication, token rotation, per-project/environment isolation and secure deletion.
- Encrypt application authentication material with managed server secrets, rotation/version metadata and owner-only access. Never put passwords/tokens into prompts. Provider session import support is a prerequisite, not an assumption.

### 3.3 CI/CD execution and benchmark suite
- CLI (`npx tinyshark run`), GitHub Actions, PR evidence comments, scheduling, environment configuration, parallel execution, explicit retry policies, isolated test data, cancellation and timeouts.
- Protect CI credentials and webhook callers; idempotent starts and explicit destructive-action permission remain mandatory.
- Benchmark original TinyFish, standard Playwright, deterministic TinyShark replay and replay with recovery on the same workflows/environments.
- Measure execution time, LLM calls/tokens, vision calls, completion rate, false-pass rate, recovery success, data correctness, unintended side effects and cost per successful test. Publish distributions and failure cases; no guaranteed 10x or sub-10-second claims.

**Acceptance:** isolated parallel suites, cancellation, scoped CI keys, expectation-driven diffs, visible quarantine, secure expiry/deletion, and a reproducible benchmark dataset with correctness and side-effect checks.