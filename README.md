# RealityGate

Build RealityGate: a developer tool that investigates software failures, compares live application behavior with documentation, and records evidence-backed verdicts.

## Live investigation pipeline

- **TinyFish Agent** (`TINYFISH_API_KEY`): opens the target website, follows the requested workflow, and returns observations through its SSE completion event.
- **TinyFish Fetch**: optionally retrieves a supplied documentation or tutorial URL.
- **RealityGate Evidence Gate**: applies conservative verdict rules. An agent run marked completed is not automatically treated as a successful user workflow.
- **Lovable AI** (`LOVABLE_API_KEY`, optional): writes an engineering narrative from recorded evidence. It does not decide or override the verdict.

The live homepage does not use the sandbox browser environment. Sandbox/lab routes are intentionally outside this migration.

## Reliability and release boundaries

- One TinyFish session per test, at most 30 steps and 180 seconds; requests stop waiting after 210 seconds. POSTs are never automatically retried, since the remote run may still be billable and active.
- Public URL validation rejects common private/local addresses, credentials and custom ports. This is not DNS rebinding protection or a provider-side network sandbox; navigation safety still depends on TinyFish honoring instructions.
- Structured observations require final-page text, visible-target actions, success criteria and photo readiness. Missing or failed evidence stays INCONCLUSIVE. A documented label mismatch must quote the supplied documentation.
- Screenshot pixels are retrieved from TinyFish run lookup (`screenshots=base64`) with server-only credentials, bounded to 8 MB, and linked to readiness observations by provider step ID. Agent-provided image URLs are not trusted.
- Exported Playwright files are **replay candidates**, not independently executed regression tests. TinyFish reports are provider observations, not direct raw browser instrumentation controlled by this app.
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
