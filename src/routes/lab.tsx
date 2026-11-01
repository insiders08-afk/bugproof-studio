import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  DEFAULT_TICKET, SCENARIOS, evidenceGate, playwrightRecipe, replayGuardrail, runSandbox,
  type Evidence, type ReplayStep, type Scenario, type Scorecard,
} from "@/lib/realitygate";
import { analyzeInvestigation, type Analysis } from "@/lib/investigate.functions";
import { TargetSnapshot } from "@/components/TargetSnapshot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "RealityGate Lab — Sandbox investigations" },
      { name: "description", content: "Turn vague software complaints into evidence-backed diagnoses and regression tests." },
      { property: "og:title", content: "RealityGate Lab — Sandbox investigations" },
      { property: "og:description", content: "Reproduce application failures, prove them with evidence, and lock fixes in with a Playwright guardrail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const VERDICT_STYLE: Record<string, string> = {
  APPLICATION_BUG: "bg-destructive/20 text-destructive border-destructive",
  NOT_REPRODUCED: "bg-success/20 text-success border-success",
  INCONCLUSIVE: "bg-muted text-muted-foreground border-border",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Dashboard() {
  const analyze = useServerFn(analyzeInvestigation);
  const [ticket, setTicket] = useState(DEFAULT_TICKET);
  const [scenario, setScenario] = useState<Scenario>("bug");
  const [running, setRunning] = useState(false);
  const [timeline, setTimeline] = useState<Evidence[]>([]);
  const [selected, setSelected] = useState<Evidence | null>(null);
  const [score, setScore] = useState<Scorecard | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [replay, setReplay] = useState<{ scenario: Scenario; steps: ReplayStep[] }[]>([]);

  async function investigate() {
    setRunning(true); setTimeline([]); setScore(null); setAnalysis(null); setReplay([]); setSelected(null);
    let run = runSandbox(scenario);
    for (const e of run.evidence) { setTimeline((t) => [...t, e]); setSelected(e); await sleep(350); }
    let gate = evidenceGate(run.evidence);
    const a = await analyze({ data: { ticket, verdict: gate.verdict, evidence: gate.facts } });
    setAnalysis(a); setScore(gate); setRunning(false);
  }

  const kindIcon: Record<string, string> = { action: "▶", dom: "◇", network: "⇄", screenshot: "▣" };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="font-mono text-xs text-primary">// failure forensics</div>
          <h1 className="text-3xl font-bold tracking-tight">RealityGate</h1>
          <p className="text-sm text-muted-foreground">Complaint → evidence → verdict → guardrail test.</p>
        </div>
        <Link to="/sandbox" className="font-mono text-sm text-info hover:underline">Open sandbox target ↗</Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Intake */}
        <section className="space-y-4">
          <Panel title="01 · Ticket">
            <Textarea rows={3} value={ticket} onChange={(e) => setTicket(e.target.value)} />
          </Panel>
          <Panel title="02 · Sandbox scenario">
            <div className="grid gap-2">
              {SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => setScenario(s.id)}
                  className={cn("rounded border p-2 text-left text-sm", scenario === s.id ? "border-primary bg-primary/10" : "border-border")}>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.hint}</div>
                </button>
              ))}
            </div>
          </Panel>
          <Button className="w-full" size="lg" onClick={investigate} disabled={running || !ticket.trim()}>
            {running ? "Investigating…" : "Run investigation"}
          </Button>
        </section>

        <section className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Live timeline">
              {timeline.length === 0 && <Empty>Run an investigation to stream evidence.</Empty>}
              <ol className="space-y-1">
                {timeline.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setSelected(e)}
                      className={cn("flex w-full gap-2 rounded px-2 py-1.5 text-left font-mono text-xs hover:bg-accent", selected?.id === e.id && "bg-accent")}>
                      <span className="text-muted-foreground">{e.id}</span>
                      <span className={e.ok ? "text-success" : "text-destructive"}>{kindIcon[e.kind]}</span>
                      <span className="flex-1">{e.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="Evidence inspector">
              {!selected ? <Empty>Select an evidence item.</Empty> : (
                <div className="space-y-3">
                  <div className="font-mono text-xs"><span className="text-primary">{selected.id} · {selected.kind}</span><div className="mt-1 break-all text-muted-foreground">{selected.detail}</div></div>
                  {selected.snapshot && <TargetSnapshot snap={selected.snapshot} highlight={selected.kind === "dom"} />}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Reproduction scorecard">
            {!score ? <Empty>{running ? "Gate evaluating evidence…" : "No verdict yet."}</Empty> : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className={cn("rounded border px-3 py-1 font-mono text-sm font-semibold", VERDICT_STYLE[score.verdict])}>{score.verdict}</span>
                  <Metric label="confidence" value={`${Math.round(score.confidence * 100)}%`} />
                  <Metric label="facts" value={score.facts.length} />
                  <Metric label="inferences" value={score.inferences.length} />
                  <Metric label="unknowns" value={score.unknowns.length} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <List title="Observed facts" tone="text-success" items={score.facts} />
                  <List title="Inferences" tone="text-info" items={score.inferences} />
                  <List title="Unknowns" tone="text-muted-foreground" items={score.unknowns} />
                </div>
                {analysis && (
                  <div className="rounded border border-border bg-muted/50 p-3 text-sm">
                    <div className="mb-1 font-mono text-xs text-muted-foreground">AI engineering analysis</div>
                    {analysis.narrative && <p>{analysis.narrative}</p>}
                    {analysis.nextSteps.length > 0 && <ul className="mt-2 list-disc pl-5 text-muted-foreground">{analysis.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>}
                    {analysis.error && <p className="mt-2 text-xs text-destructive">{analysis.error}</p>}
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Crash-to-Guardrail">
            {score?.verdict !== "APPLICATION_BUG" ? (
              <Empty>{score ? "Guardrails are only generated for confirmed application bugs." : "Waiting for a confirmed bug."}</Empty>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <pre className="max-h-80 overflow-auto rounded border border-border bg-background p-3 font-mono text-[11px] leading-relaxed">{playwrightRecipe("Create Endpoint")}</pre>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setReplay((r) => [{ scenario: "bug", steps: replayGuardrail("bug", "Create Endpoint") }, ...r])}>Replay: before fix</Button>
                    <Button onClick={() => setReplay((r) => [{ scenario: "repaired", steps: replayGuardrail("repaired", "Create Endpoint") }, ...r])}>Replay: after fix</Button>
                  </div>
                  {replay.map((r, i) => {
                    const pass = r.steps.every((s) => s.pass);
                    return (
                      <div key={i} className="rounded border border-border p-2 font-mono text-xs">
                        <div className={pass ? "text-success" : "text-destructive"}>{pass ? "✓ PASSED" : "✗ FAILED"} · {r.scenario === "bug" ? "before fix" : "after fix"}</div>
                        {r.steps.map((s, j) => <div key={j} className="text-muted-foreground"><span className={s.pass ? "text-success" : "text-destructive"}>{s.pass ? "✓" : "✗"}</span> {s.name} — {s.detail}</div>)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;
const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div><div className="font-mono text-lg font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
);
const List = ({ title, items, tone }: { title: string; items: string[]; tone: string }) => (
  <div>
    <div className={cn("mb-1 text-xs font-semibold uppercase", tone)}>{title}</div>
    <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">{items.map((i) => <li key={i}>{i}</li>)}</ul>
  </div>
);
