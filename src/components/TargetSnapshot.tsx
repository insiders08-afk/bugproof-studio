import type { TargetSnapshot as Snap } from "@/lib/realitygate";
import { cn } from "@/lib/utils";

/** Rendered "screenshot" of the sandbox target at a moment in time. */
export function TargetSnapshot({ snap, highlight }: { snap: Snap; highlight?: boolean }) {
  return (
    <div className="overflow-hidden rounded border border-border bg-background font-mono text-xs">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-2 py-1">
        <span className="size-2 rounded-full bg-destructive" />
        <span className="size-2 rounded-full bg-primary" />
        <span className="size-2 rounded-full bg-success" />
        <span className="ml-2 text-muted-foreground">sandbox.local/settings/webhooks</span>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Webhooks</span>
          <span
            className={cn(
              "rounded bg-primary px-2 py-0.5 text-primary-foreground",
              highlight && "ring-2 ring-info ring-offset-2 ring-offset-background",
            )}
          >
            {snap.buttonLabel}
          </span>
        </div>
        {snap.banner && (
          <div
            className={cn(
              "rounded px-2 py-1",
              snap.banner.tone === "error" ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success",
            )}
          >
            {snap.banner.text}
          </div>
        )}
        {snap.formOpen && (
          <div className="rounded border border-border p-2">
            <div className="text-muted-foreground">Endpoint URL</div>
            <div className="mt-1 rounded border border-input px-2 py-1">{snap.url || "\u00a0"}</div>
          </div>
        )}
        <div className="rounded border border-dashed border-border p-2 text-muted-foreground">
          {snap.rows.length ? snap.rows.map((r) => <div key={r} className="text-foreground">{r}</div>) : "No endpoints yet"}
        </div>
      </div>
    </div>
  );
}
