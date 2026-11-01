import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { runLiveTest, type LiveReport } from "@/lib/livetest.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RealityGate — Test any website in plain English" },
      { name: "description", content: "Paste a URL, describe the test in plain English, get an evidence-backed verdict with screenshots." },
      { property: "og:title", content: "RealityGate — Test any website in plain English" },
      { property: "og:description", content: "Real browser runs, TinyFish test verdicts, screenshots and safe Playwright replay candidates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const KEY = "realitygate.history.v1";
const VERDICT_STYLE: Record<string, string> = {
  FAILED: "bg-destructive/20 text-destructive border-destructive",
  APPLICATION_BUG: "bg-destructive/20 text-destructive border-destructive",
  DOCUMENTATION_DRIFT: "bg-primary/20 text-primary border-primary",
  PASS: "bg-success/20 text-success border-success",
  INCONCLUSIVE: "bg-muted text-muted-foreground border-border",
};

function Home() {
  const run = useServerFn(runLiveTest);
  const [url, setUrl] = useState("https://");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState<LiveReport[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(stored)) setHistory(stored.filter((r): r is LiveReport => Boolean(r && typeof r === "object" && typeof r.id === "string" && typeof r.prompt === "string" && typeof r.url === "string" && typeof r.createdAt === "string" && Array.isArray(r.evidence) && Array.isArray(r.screenshots) && Array.isArray(r.errors) && Array.isArray(r.nextSteps) && r.plan && Array.isArray(r.plan.steps) && Array.isArray(r.plan.expectedTexts) && Array.isArray(r.plan.forbiddenTexts))).slice(0, 30));
    } catch { setErr("Saved history could not be read. New tests can still run."); }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setErr("");
    try {
      const r = await run({ data: { url: url.trim(), prompt: prompt.trim() } });
      const next = [r, ...history].slice(0, 30);
      setHistory(next); setOpen(r.id);
      try { localStorage.setItem(KEY, JSON.stringify(next)); }
      catch { setErr("Test completed, but your browser could not save the history."); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { submitting.current = false; setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-10 flex items-center justify-between">
        <div className="font-mono text-sm"><span className="text-primary">//</span> RealityGate</div>
        <Link to="/lab" className="font-mono text-xs text-info hover:underline">Sandbox lab ↗</Link>
      </header>

      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Test any website in plain English.</h1>
        <p className="mt-2 text-muted-foreground">A real browser runs your test. You get the verdict, the screenshots and the proof.</p>
      </section>

      <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-lg">
        <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Website URL</label>
        <Input aria-label="Website URL" type="url" required maxLength={2000} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="h-11 font-mono" />
        <label className="block pt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">What should we test?</label>
        <Textarea aria-label="What should we test?" required maxLength={2000} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g. "Search for laptop and check that results appear" or "The pricing page should show a Pro plan"' />
        <Button type="submit" size="lg" className="w-full" disabled={busy || prompt.trim().length < 3}>
          {busy ? "TinyFish is investigating…" : "Run test"}
        </Button>
        {busy && <p role="status" className="text-center text-xs text-muted-foreground">Waiting for the real TinyFish browser run to finish. This can take a few minutes.</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
      </form>

      <section className="mt-12">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Past tests</h2>
        {history.length === 0 && <p className="text-sm text-muted-foreground">No tests yet.</p>}
        <div className="space-y-3">
          {history.map((r) => (
            <div key={r.id} className="rounded border border-border bg-card">
              <Button variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex h-auto w-full items-center gap-3 whitespace-normal p-3 text-left">
                <span className={cn("rounded border px-2 py-0.5 font-mono text-[11px] font-semibold", VERDICT_STYLE[r.verdict])}>{r.verdict}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{r.prompt}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">{r.url} · {new Date(r.createdAt).toLocaleString()}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">{r.verdictSource === "tinyfish" ? "TinyFish" : "Legacy"}</span>
              </Button>
              {open === r.id && <Report r={r} />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Report({ r }: { r: LiveReport }) {
  return (
    <div className="space-y-5 border-t border-border p-4 text-sm">
      {r.finalUrl && <p className="break-all font-mono text-xs text-muted-foreground">Final page: {r.finalUrl}</p>}
      <Block title="TinyFish run"><p className="font-mono text-xs">Status: {r.agentStatus}{r.providerOutcome ? ` · Test outcome: ${r.providerOutcome}` : ""}{r.tinyfishRunId ? ` · Run: ${r.tinyfishRunId}` : ""}</p>{r.tinyfishStreamUrl && <a className="text-info underline" href={r.tinyfishStreamUrl} target="_blank" rel="noreferrer">Open live browser stream ↗</a>}</Block>
      {r.providerSummary && <Block title="TinyFish conclusion"><p>{r.providerSummary}</p></Block>}
      {r.replayUnavailable && <Block title="Replay limitations"><p>{r.replayUnavailable}</p></Block>}
      {r.narrative && <Block title="AI summary"><p>{r.narrative}</p>
        {r.nextSteps.length > 0 && <ul className="mt-2 list-disc pl-5 text-muted-foreground">{r.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>}</Block>}
      {r.screenshots.length > 0 && <Block title="TinyFish screenshots">
        <div className="grid gap-3 sm:grid-cols-2">{r.screenshots.map((s, i) => (
          <a key={i} href={s} target="_blank" rel="noreferrer"><img src={s} alt={`Screenshot ${i + 1} of ${r.url}`} className="rounded border border-border" loading="lazy" /></a>
        ))}</div></Block>}
      <Block title="Agent-reported workflow"><ol className="list-decimal pl-5 text-muted-foreground">{r.plan.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <div className="mt-2 font-mono text-xs text-muted-foreground">Expected: {r.plan.expectedTexts.join(", ") || "—"} · Failure signs: {r.plan.forbiddenTexts.join(", ") || "—"}</div></Block>
      <Block title="Evidence">
        <ol className="space-y-1 font-mono text-xs">{r.evidence.filter((e) => e.kind !== "screenshot").map((e) => (
          <li key={e.id} className="flex gap-2"><span className="text-muted-foreground">{e.id}</span><span className={e.ok ? "text-success" : "text-destructive"}>{e.ok ? "✓" : "✗"}</span><span className="flex-1 break-all">{e.label} <span className="text-muted-foreground">— {e.detail.slice(0, 200)}</span></span></li>
        ))}</ol></Block>
      {r.unknowns && r.unknowns.length > 0 && <Block title="Unknowns / limitations"><ul className="list-disc pl-5 text-muted-foreground">{r.unknowns.map((s, i) => <li key={i}>{s}</li>)}</ul></Block>}
      {r.playwright && <Block title={r.verdict === "APPLICATION_BUG" || r.verdict === "FAILED" ? "Playwright regression candidate" : "Playwright replay candidate"}>
        <Button variant="outline" onClick={() => {
          const objectUrl = URL.createObjectURL(new Blob([r.playwright], { type: "text/plain" }));
          const link = document.createElement("a"); link.href = objectUrl; link.download = `realitygate-${r.id}.spec.ts`; link.click();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        }}>Download test</Button>
        <pre className="mt-3 max-h-80 overflow-auto border border-border bg-background p-3 text-xs"><code>{r.playwright}</code></pre>
      </Block>}
      {r.errors.length > 0 && <p className="text-xs text-destructive">{r.errors.join(" · ")}</p>}
    </div>
  );
}
const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div><div className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</div>{children}</div>
);
