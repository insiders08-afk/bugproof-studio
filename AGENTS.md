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

- liveGate maps only TinyFish's explicit test outcome to PASS, FAILED or INCONCLUSIVE so AI narration and evidence checks cannot override the provider. FAILED is a failed test, not proof of application fault; APPLICATION_BUG remains a legacy live-report label.
- Real-site runs start once through TinyFish run-async with bounded duration and screenshot capture; persist provider IDs before polling and never automatically retry billable starts. Cloud test_runs stores owner-private history, not browser localStorage.
- Authenticated server functions verify identity before dynamically importing privileged run helpers; all privileged reads/writes additionally scope to the verified owner. Only server helpers can write provider reports, preventing forged browser verdicts.
- Provider execution survives navigation; owner-triggered polls recover completion using an expiring database finalization lease. Private capture paths are signed on read; no background promises or in-memory job state.
- AccountSession owns identity-transition subscription; public home has inline Google sign-in, and private server functions require auth even though the home itself is public.
- Repeat test starts a fresh provider investigation with the saved URL and prompt, not a deterministic replay. TestReport presents provider conclusions while retaining hidden evidence limitations in stored reports.
- Decode TinyFish outcomes independently of report-contract validation in src/lib/tinyfish-bridge.ts; completion status is not test success, and missing observations/artifacts affect limitations and replay eligibility only. Reports record verdictSource and providerOutcome; historical verdicts remain unchanged and labeled Legacy.
- Export only complete safe structured action sequences as Playwright replay candidates; do not infer executable clicks from native prose, drop unsafe intermediate actions, or call provider-reported observations independently verified guardrails.
- Retrieve screenshot pixels via authenticated TinyFish run lookup with inline base64 and correlate readiness by provider step ID; never expose credentials or trust agent-invented screenshot URLs.
- Browser commands and replay recipes share src/lib/live-browser.ts so observed actions and exported tests follow the same targeting and readiness rules.
- The old simulated lab/sandbox demo is removed; the app only tests real websites, and external documentation URL scraping is absent so live tests never depend on reference fetching.
