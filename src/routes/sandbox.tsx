import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SCENARIOS, targetBehaviour, type Scenario } from "@/lib/realitygate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sandbox")({
  head: () => ({
    meta: [
      { title: "Sandbox Target — RealityGate" },
      { name: "description", content: "Controlled webhook app with application-bug and repaired scenarios for RealityGate investigations." },
      { property: "og:title", content: "Sandbox Target — RealityGate" },
      { property: "og:description", content: "Toggle application-bug and repaired states on a live target app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sandbox,
});

function Sandbox() {
  const [scenario, setScenario] = useState<Scenario>("bug");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const b = targetBehaviour(scenario);

  const save = () => {
    const ok = b.saveStatus < 400;
    setLog((l) => [`POST /api/webhooks → ${b.saveStatus} ${b.saveBody}`, ...l]);
    if (ok) {
      setRows((r) => [...r, `${url || "https://example.com/hook"} · Active`]);
      setOpen(false);
      setBanner({ ok: true, text: "Endpoint created" });
    } else setBanner({ ok: false, text: "Something went wrong" });
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="font-mono text-sm text-muted-foreground hover:text-foreground">← RealityGate</Link>
        <div className="flex gap-1 rounded border border-border p-1">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setScenario(s.id); setBanner(null); setOpen(false); }}
              className={cn("rounded px-3 py-1 text-xs", scenario === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <h1 className="text-2xl font-bold">Sandbox Target · Webhooks</h1>
      <p className="mb-4 text-sm text-muted-foreground">{SCENARIOS.find((s) => s.id === scenario)?.hint}</p>
      <div className="rounded border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Endpoints</h2>
          <Button onClick={() => setOpen(true)}>{b.buttonLabel}</Button>
        </div>
        {banner && (
          <div role="alert" className={cn("mt-3 rounded px-3 py-2 text-sm", banner.ok ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
            {banner.text}
          </div>
        )}
        {open && (
          <div className="mt-4 space-y-2 rounded border border-border p-3">
            <label className="text-sm" htmlFor="url">Endpoint URL</label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hook" />
            <Button variant="secondary" onClick={save}>Save</Button>
          </div>
        )}
        <table className="mt-4 w-full text-sm">
          <tbody>
            {rows.length ? rows.map((r, i) => <tr key={i}><td className="border-t border-border py-2 font-mono">{r}</td></tr>)
              : <tr><td className="py-2 text-muted-foreground">No endpoints yet</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded border border-border bg-muted p-3 font-mono text-xs">
        <div className="mb-1 text-muted-foreground">network</div>
        {log.length ? log.map((l, i) => <div key={i} className={l.includes("→ 5") ? "text-destructive" : "text-success"}>{l}</div>) : "—"}
      </div>
    </div>
  );
}
