# RealityGate

RealityGate investigates real website workflows and records evidence-backed verdicts. External documentation URLs and scraping are not supported.

## Live investigation pipeline

- **TinyFish Agent** (`TINYFISH_API_KEY`): starts through `run-async`, returns a provider run ID immediately, and executes independently of the browser tab. Owner-authenticated polling retrieves its outcome.
- **TinyFish native run lookup**: retrieves the actual workflow timeline and inline screenshot pixels, independently of optional structured result arrays.
- **TinyFish verdict**: its explicit `outcome` alone determines PASS (`success`), FAILED (`failure`), or INCONCLUSIVE (`blocked`, `incomplete`, `unknown`, or absent). Execution status `COMPLETED` alone is not test success. FAILED means the requested test failed, not independent proof of an application bug.
- **Lovable AI** (`LOVABLE_API_KEY`, optional): writes an engineering narrative from recorded evidence. It does not decide or override the verdict.

The old simulated lab and sandbox pages have been removed.

## Reliability and release boundaries

- One TinyFish session per test, bounded to 180 seconds; startup waits at most 20 seconds. A unique owner/request key prevents duplicate launches. Ambiguous starts are marked for review and never retried automatically.
- Public URL validation rejects common private/local addresses, credentials and custom ports. This is not DNS rebinding protection or a provider-side network sandbox; navigation safety still depends on TinyFish honoring instructions.
- The explicit provider outcome is decoded separately from report validation. Missing text, mismatched success criteria, intermediate errors, or unavailable screenshots cannot override it; these remain evidence limitations. Missing photo counts/readiness and HTTP status remain explicit unknowns, not invented failures. A successful negative check passes. New reports identify TinyFish as their verdict source without an invented confidence percentage; historical verdicts remain unchanged and labeled Legacy.
- Screenshot pixels are retrieved from TinyFish run lookup (`screenshots=base64`) with server-only credentials, bounded to 8 MB. Optional readiness observations are linked only by exact provider step ID. Agent-provided image URLs are not trusted. This inline response format has been verified against an actual run; native step descriptions do not establish structured click targets or final-page DOM instrumentation.
- Exported Playwright files are **replay candidates**, not independently executed regression tests. Only complete, safe, visible-label structured action sequences qualify. Native descriptions are never guessed into executable clicks; a missing sequence is explained without suppressing the verdict or screenshots. Visible-text assertions do not independently prove a button's disabled state or lack of side effects.
- Google-only sign-in protects paid test actions. Each owner reads only their own Cloud history; browser clients cannot write or forge provider reports. Captures are saved in private storage and signed on authorized read.
- Reopening the page resumes polling saved active tests. Final reports are prepared on an owner poll using an expiring lease; without an open tab the provider continues, and the report is prepared when the owner returns. No detached background promises are used.
- Repeat test starts a new TinyFish investigation using the original URL and instructions, not a deterministic Playwright replay. Historical browser-local reports are not automatically attributed to an account.
- **Not certified for unrestricted public production:** no application rate limits or quotas were added, as requested. Google account creation and an authenticated live TinyFish run still need acceptance testing; external authentication walls and provider-side safety remain unverified.

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
