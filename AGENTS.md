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
- Real-site runs use Firecrawl scrape with actions + screenshots via the connector gateway; past tests are stored in browser localStorage (no backend yet).
