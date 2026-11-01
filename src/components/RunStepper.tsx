import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { MILESTONES, currentMilestone, formatElapsed } from '@/lib/milestones';
import { cn } from '@/lib/utils';

export function RunStepper({ status, createdAt, hasVerdict }: { status: string; createdAt: string; hasVerdict: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = now === null ? 0 : (now - Date.parse(createdAt)) / 1000;
  const current = currentMilestone(status, elapsed, hasVerdict);
  return <div className="space-y-4">
    <div className="flex items-center justify-between font-mono text-xs font-semibold uppercase">
      <span>Live test progress</span>
      <span className="border-2 border-border bg-card px-2 py-1 tabular-nums" aria-label="Elapsed time">{formatElapsed(elapsed)}</span>
    </div>
    <ol className="space-y-2">{MILESTONES.map((m, i) => {
      const state = i < current ? 'done' : i === current ? 'running' : 'waiting';
      return <li key={m.title} className={cn('flex items-center gap-3 border-2 border-border p-3', state === 'running' ? 'bg-accent' : state === 'done' ? 'bg-card' : 'bg-muted/40 text-muted-foreground')}>
        <span className="grid size-7 shrink-0 place-items-center border-2 border-border bg-card font-mono text-xs font-bold">
          {state === 'done' ? <Check className="tick-pop size-4 text-success" aria-hidden="true" /> : i + 1}
        </span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{m.title}</span><span className="block text-xs text-muted-foreground">{m.detail}</span></span>
        <span className={cn('shrink-0 border-2 border-border px-2 py-0.5 font-mono text-[11px] font-bold', state === 'done' ? 'bg-primary text-primary-foreground' : state === 'running' ? 'status-glow bg-secondary text-secondary-foreground' : 'bg-card')}>
          {state === 'done' ? 'DONE' : state === 'running' ? 'RUNNING' : 'WAITING'}
        </span>
      </li>;
    })}</ol>
  </div>;
}
