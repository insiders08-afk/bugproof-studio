<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- RealityGate verdicts come only from deterministic gates in src/lib/realitygate.ts (evidenceGate for the sandbox lab, liveGate for real URLs); AI (src/lib/livetest.functions.ts, src/lib/investigate.functions.ts) only plans actions/expected texts and narrates, so conclusions stay evidence-backed.
- Real-site runs use one TinyFish run-sse session with bounded duration and screenshot capture enabled; preserving the run identifier and never retrying POST automatically avoids losing failure state or duplicating billable actions. Past tests remain in browser localStorage (no backend yet).
- TinyFish results must satisfy src/lib/live-contract.ts before liveGate can confirm a verdict; final-page text, visible-target observations and screenshot readiness prevent agent completion or summaries from masquerading as proof.
- Export only safe observed actions as Playwright replay candidates, not independently executed guardrails; TinyFish observations are provider-reported and must remain labelled as such.
- Retrieve screenshot pixels via authenticated TinyFish run lookup with inline base64 and correlate readiness by provider step ID; never expose credentials or trust agent-invented screenshot URLs.
- Browser commands and replay recipes share src/lib/live-browser.ts so observed actions and exported tests follow the same targeting and readiness rules.
