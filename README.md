# BugProof Studio

Build RealityGate: a developer tool that investigates software failures, proves what happened with evidence, and preserves confirmed bugs as repeatable tests.

Instead of TinyFish, use Firecrawl for documentation scraping and browser actions, paired with Lovable AI for orchestration and planning.

Core features:
1. Ticket-to-Tutorial Arbiter: Compares complaints and tutorial documentation against live application behavior to detect documentation drift versus genuine application bugs.
2. Evidence Gate & Reproduction Scorecard: Verifies actions, DOM states, and network errors, strictly separating observed facts, inferences, and unknowns.
3. Crash-to-Guardrail: Converts confirmed bugs into repeatable Playwright regression test recipes and provides an interactive replay runner to verify before/after fixes.
4. Built-in Sandbox Target: A controlled target application with interactive scenario toggles (Application Bug, Documentation Drift, and Repaired) for instant testing.
5. Investigation Dashboard: Live timeline feed, screenshot & evidence inspector, scorecard metrics, and test runner.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4b3c86c6-e23f-40af-a561-7f37e798f5d5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
