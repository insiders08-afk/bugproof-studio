# RealityGate

RealityGate investigates real website workflows and records evidence-backed verdicts. External documentation URLs and scraping are not supported; the sandbox lab retains its built-in tutorial fixture.

## Live investigation pipeline

- **TinyFish Agent** (`TINYFISH_API_KEY`): opens the target website, follows the requested workflow, and returns observations through its SSE completion event.
- **TinyFish native run lookup**: retrieves the actual workflow timeline and inline screenshot pixels, independently of optional structured result arrays.
- **TinyFish verdict**: its explicit `outcome` alone determines PASS (`success`), FAILED (`failure`), or INCONCLUSIVE (`blocked`, `incomplete`, `unknown`, or absent). Execution status `COMPLETED` alone is not test success. FAILED means the requested test failed, not independent proof of an application bug.
- **Lovable AI** (`LOVABLE_API_KEY`, optional): writes an engineering narrative from recorded evidence. It does not decide or override the verdict.

The live homepage does not use the sandbox browser environment. Sandbox/lab routes are intentionally outside this migration.

## Reliability and release boundaries

- One TinyFish session per test, bounded to 180 seconds; requests stop waiting after 210 seconds. POSTs are never automatically retried, since the remote run may still be billable and active.
- Public URL validation rejects common private/local addresses, credentials and custom ports. This is not DNS rebinding protection or a provider-side network sandbox; navigation safety still depends on TinyFish honoring instructions.
- The explicit provider outcome is decoded separately from report validation. Missing text, mismatched success criteria, intermediate errors, or unavailable screenshots cannot override it; these remain evidence limitations. Missing photo counts/readiness and HTTP status remain explicit unknowns, not invented failures. A successful negative check passes. New reports identify TinyFish as their verdict source without an invented confidence percentage; historical verdicts remain unchanged and labeled Legacy.
- Screenshot pixels are retrieved from TinyFish run lookup (`screenshots=base64`) with server-only credentials, bounded to 8 MB. Optional readiness observations are linked only by exact provider step ID. Agent-provided image URLs are not trusted. This inline response format has been verified against an actual run; native step descriptions do not establish structured click targets or final-page DOM instrumentation.
- Exported Playwright files are **replay candidates**, not independently executed regression tests. Only complete, safe, visible-label structured action sequences qualify. Native descriptions are never guessed into executable clicks; a missing sequence is explained without suppressing the verdict or screenshots. Visible-text assertions do not independently prove a button's disabled state or lack of side effects.
- History remains browser-local and may reach browser storage limits with screenshots; a save error is surfaced without discarding the displayed report.
- **Not certified for unrestricted public production:** the paid investigation function is currently unauthenticated. Before public release add server-side user authentication, durable quotas/rate limits, persistent job execution/cancellation and server-side history. Also validate real screenshot/step correlation and a successful workflow with a working TinyFish credential; external authentication walls and provider-side safety remain unverified.

## Environment

Set these server-side variables in your deployment environment. Do not use a `VITE_` prefix:

```env
TINYFISH_API_KEY=YOUR_TINYFISH_API_KEY_HERE
LOVABLE_API_KEY=YOUR_LOVABLE_API_KEY_HERE
```

The placeholder values are fake. Replace them with real credentials before running a live investigation. Never commit real API keys.

## Development

```sh
npm install
npm run dev
npm test
npm run lint
npm run build
```
