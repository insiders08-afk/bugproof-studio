# BugProof Studio

Build RealityGate: a developer tool that investigates software failures, compares live application behavior with documentation, and records evidence-backed verdicts.

## Live investigation pipeline

- **TinyFish Agent** (`TINYFISH_API_KEY`): opens the target website, follows the requested workflow, and returns observations through its SSE completion event.
- **TinyFish Fetch**: optionally retrieves a supplied documentation or tutorial URL.
- **RealityGate Evidence Gate**: applies conservative verdict rules. An agent run marked completed is not automatically treated as a successful user workflow.
- **Lovable AI** (`LOVABLE_API_KEY`, optional): writes an engineering narrative from recorded evidence. It does not decide or override the verdict.

The live homepage does not use the sandbox browser environment. Sandbox/lab routes are intentionally outside this migration.

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
