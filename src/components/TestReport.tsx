import type { ReactNode } from 'react';
import type { LiveReport } from '@/lib/livetest.functions';
import { Button } from '@/components/ui/button';
import { Download, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
const Block = ({ title, children }: { title: string; children: ReactNode }) => <div><h3 className="mb-3 font-mono text-xs font-semibold uppercase">{title}</h3>{children}</div>;
export function TestReport({ r }: { r: LiveReport }) {
  return <div className="space-y-7 border-t-2 border-border p-5 text-sm sm:p-6">
    {r.finalUrl && <p className="break-all font-mono text-xs text-muted-foreground">Final page: {r.finalUrl}</p>}
    {r.gateReason ? <>
      <Block title="TinyFish run"><p className="mb-3 text-2xl font-bold text-primary">{(r.agentStatus || 'unknown').toUpperCase()}</p><p className="leading-relaxed">{r.providerSummary || 'No conclusion was returned.'}</p>{r.requirementCheck && <p className="mt-3 border-l-4 border-secondary pl-3 leading-relaxed">{r.requirementCheck}</p>}</Block>
      <Block title="Gateway verdict"><p className={cn('mb-3 inline-block border-2 border-border px-3 py-1 font-mono text-lg font-bold', r.verdict === 'PASS' ? 'bg-primary text-primary-foreground' : r.verdict === 'FAILED' ? 'bg-secondary text-secondary-foreground' : 'bg-muted')}>{r.verdict}</p><p className="leading-relaxed">{r.gateReason}</p><p className="mt-2 font-mono text-xs text-muted-foreground">Requirement met: {(r.requirementMet ?? 'unknown').toUpperCase()}</p></Block>
    </> : <Block title="TinyFish conclusion"><p className="mb-3 text-2xl font-bold text-primary">{(r.providerOutcome ?? 'unknown').toUpperCase()}</p><p className="leading-relaxed">{r.providerSummary || 'No conclusion was returned.'}</p></Block>}
    {r.narrative && <Block title="AI summary"><p className="leading-relaxed">{r.narrative}</p>{r.nextSteps.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">{r.nextSteps.map((s, i) => <li key={i}>{s}</li>)}</ul>}</Block>}
    {r.screenshots.length > 0 && <Block title="TinyFish screenshots"><div className="grid gap-4 sm:grid-cols-2">{r.screenshots.map((s, i) => <a key={i} href={s} target="_blank" rel="noreferrer" className="block border-2 border-border"><img src={s} alt={`Test screenshot ${i + 1}`} className="aspect-[4/3] w-full object-contain bg-background" loading="lazy" /></a>)}</div></Block>}
    <Block title="Agent-reported workflow"><ol className="list-decimal space-y-2 pl-5 leading-relaxed">{r.plan.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></Block>
    <Block title="Evidence"><ol className="space-y-3">{r.evidence.filter(e => e.kind !== 'screenshot').map(e => <li key={e.id} className="flex items-start gap-3"><span className="mt-0.5 font-mono text-xs text-muted-foreground">{e.id}</span>{e.ok ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Observed" /> : <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Unsuccessful" />}<span className="min-w-0 break-words leading-relaxed">{e.label}<span className="mt-1 block text-xs text-muted-foreground">{e.detail.slice(0, 200)}</span></span></li>)}</ol></Block>
    {r.playwright && <Button variant="outline" onClick={() => { const u = URL.createObjectURL(new Blob([r.playwright], { type: 'text/plain' })); const a = document.createElement('a'); a.href = u; a.download = `realitygate-${r.id}.spec.ts`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }}><Download />Download Playwright candidate</Button>}
  </div>;
}
