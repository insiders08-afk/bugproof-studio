// Client-side milestone progression for a running test, driven by saved status + elapsed time.
export const MILESTONES = [
  { title: 'Writing the test workflow', detail: 'TinyFish turns your request into browser steps' },
  { title: 'Opening the website', detail: 'A real cloud browser loads the page' },
  { title: 'Investigating & taking screenshots', detail: 'Clicking, waiting for photos, capturing evidence' },
  { title: 'Writing the report', detail: 'Saving screenshots and summarising what happened' },
  { title: 'Gateway verdict', detail: 'Checking whether your requirement was met' },
] as const;

const queued = new Set(['STARTING', 'QUEUED', 'PENDING']);

/** Index of the milestone currently in progress; MILESTONES.length means all done. */
export function currentMilestone(status: string, elapsedSeconds: number, hasVerdict: boolean): number {
  if (hasVerdict) return MILESTONES.length;
  if (status === 'REPORTING' || status === 'COMPLETED') return 3;
  if (queued.has(status)) return 0;
  // RUNNING / IN_PROGRESS: advance with time, never past the investigation step.
  if (elapsedSeconds < 10) return 0;
  if (elapsedSeconds < 25) return 1;
  return 2;
}

export function formatElapsed(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
