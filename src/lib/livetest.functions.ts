import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { PublicUrl } from './live-contract';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export type { LiveReport, Plan } from './live-report.server';
export type { RunItem } from './test-runs.server';
const Id = z.object({ id: z.string().uuid() });
export const runLiveTest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: PublicUrl, prompt: z.string().trim().min(3).max(2000), requestKey: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { startRun } = await import('./test-runs.server');
    return startRun(context.userId, data);
  });
export const listTests = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('test_runs').select('id,url,prompt,status,created_at,error,report->verdict').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(30);
    if (error) throw new Error('Saved tests could not be loaded.');
    return (data ?? []).map(row => ({ ...row, verdict: typeof row.verdict === 'string' ? row.verdict : undefined }));
  });
export const pollTest = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => {
    const { refreshRun } = await import('./test-runs.server');
    return refreshRun(context.userId, data.id);
  });
export const getTestReport = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => {
    const { readReport } = await import('./test-runs.server');
    return readReport(context.userId, data.id);
  });
