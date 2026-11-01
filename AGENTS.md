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
- TinyFish core conclusions are normalized separately from optional measurements in src/lib/tinyfish-bridge.ts; liveGate requires matching final observations plus native artifacts, while missing optional readiness/network data is a limitation rather than a contract rejection.
- Export only complete safe structured action sequences as Playwright replay candidates; do not infer executable clicks from native prose, drop unsafe intermediate actions, or call provider-reported observations independently verified guardrails.
- Retrieve screenshot pixels via authenticated TinyFish run lookup with inline base64 and correlate readiness by provider step ID; never expose credentials or trust agent-invented screenshot URLs.
- Browser commands and replay recipes share src/lib/live-browser.ts so observed actions and exported tests follow the same targeting and readiness rules.
- External documentation URL scraping is absent from live and lab APIs; the lab's built-in tutorial remains an isolated simulation fixture so live tests do not depend on external reference fetching.
