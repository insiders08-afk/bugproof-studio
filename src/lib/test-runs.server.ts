import { buildLiveReport, type LiveReport } from './live-report.server';
import { startTinyFishAgent, fetchTinyFishStatus, fetchTinyFishArtifacts } from './tinyfish';
import { LIVE_OUTPUT_SCHEMA } from './tinyfish-bridge';
import { testGoal } from './test-goal';
import type { Json, Tables } from '@/integrations/supabase/types';

export type RunItem = Pick<Tables<'test_runs'>, 'id' | 'url' | 'prompt' | 'status' | 'created_at' | 'error'> & { verdict?: string | undefined };
const terminal = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']);
export function assertOwner(row: { user_id: string } | null, userId: string) {
  if (!row || row.user_id !== userId) throw new Error('Test not found.');
}
async function admin() { return (await import('@/integrations/supabase/client.server')).supabaseAdmin; }
function item(row: Tables<'test_runs'>): RunItem {
  const report = row.report as unknown as LiveReport | null;
  return { id: row.id, url: row.url, prompt: row.prompt, status: row.status, created_at: row.created_at, error: row.error, ...(report ? { verdict: report.verdict } : {}) };
}
export async function startRun(userId: string, input: { url: string; prompt: string; requestKey: string }) {
  const db = await admin();
  const { data: existing, error: lookupError } = await db.from('test_runs').select('*').eq('user_id', userId).eq('request_key', input.requestKey).maybeSingle();
  if (lookupError) throw new Error('Saved tests could not be checked.');
  if (existing) return item(existing);
  const { data: row, error } = await db.from('test_runs').insert({ user_id: userId, url: input.url, prompt: input.prompt, request_key: input.requestKey }).select().single();
  if (error || !row) {
    if (error?.code === '23505') {
      const { data: duplicate } = await db.from('test_runs').select('*').eq('user_id', userId).eq('request_key', input.requestKey).single();
      if (duplicate) return item(duplicate);
    }
    throw new Error('Your test could not be saved. No browser test was started.');
  }
  try {
    const providerId = await startTinyFishAgent(input.url, testGoal(input.url, input.prompt), LIVE_OUTPUT_SCHEMA);
    const { data: updated, error: updateError } = await db.from('test_runs').update({ provider_run_id: providerId, status: 'RUNNING' }).eq('id', row.id).eq('user_id', userId).select().single();
    if (updateError || !updated) {
      const { error: recoveryError } = await db.from('test_runs').update({ provider_run_id: providerId, status: 'RUNNING' }).eq('id', row.id).eq('user_id', userId);
      if (!recoveryError) return { ...item(row), status: 'RUNNING' };
      throw new Error('Test started but recovery details could not be saved. Do not repeat automatically.');
    }
    return item(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Test startup was interrupted.';
    await db.from('test_runs').update({ status: 'START_UNCERTAIN', error: message }).eq('id', row.id).eq('user_id', userId);
    return { ...item(row), status: 'START_UNCERTAIN', error: message };
  }
}
export async function refreshRun(userId: string, id: string) {
  const db = await admin();
  const { data: row, error } = await db.from('test_runs').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Your test could not be loaded.');
  assertOwner(row, userId);
  if (!row) throw new Error('Test not found.');
  if (row.report || !row.provider_run_id || row.status === 'START_UNCERTAIN') {
    if (row.status === 'STARTING' && Date.now() - Date.parse(row.created_at) > 60_000) {
      await db.from('test_runs').update({ status: 'START_UNCERTAIN', error: 'Startup was interrupted. A remote test may exist; no automatic repeat was attempted.' }).eq('id', id).eq('user_id', userId);
      return { ...item(row), status: 'START_UNCERTAIN', error: 'Startup was interrupted. A remote test may exist; no automatic repeat was attempted.' };
    }
    return item(row);
  }
  const state = await fetchTinyFishStatus(row.provider_run_id);
  if (!terminal.has(state.status)) {
    await db.from('test_runs').update({ status: state.status }).eq('id', id).eq('user_id', userId);
    return { ...item(row), status: state.status };
  }
  const now = new Date().toISOString();
  const { data: leased, error: leaseError } = await db.from('test_runs').update({ status: 'REPORTING', finalize_lease_until: new Date(Date.now() + 90_000).toISOString() })
    .eq('id', id).eq('user_id', userId).is('report', null).or(`finalize_lease_until.is.null,finalize_lease_until.lt.${now}`).select().maybeSingle();
  if (leaseError) throw new Error('The report could not be prepared. Try refreshing.');
  if (!leased) return { ...item(row), status: 'REPORTING' };
  try {
    let artifacts;
    try { artifacts = await fetchTinyFishArtifacts(row.provider_run_id); } catch { /* verdict remains provider-owned */ }
    const report = await buildLiveReport(row, { runId: row.provider_run_id, status: state.status, result: state.result, events: [] }, artifacts);
    report.id = row.id; report.createdAt = row.created_at;
    const replacements = new Map<string, string>();
    for (const [i, image] of report.screenshots.entries()) {
      const match = image.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
      if (!match?.[1] || !match[2]) continue;
      const path = `${userId}/${row.id}/${i}.${match[1]}`;
      const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      const { error: uploadError } = await db.storage.from('test-captures').upload(path, bytes, { contentType: `image/${match[1]}`, upsert: true });
      if (uploadError) throw new Error('Screenshot saving failed. Your test will be recovered on refresh.');
      replacements.set(image, path);
    }
    report.screenshots = report.screenshots.map(image => replacements.get(image) ?? image);
    report.evidence = report.evidence.map(e => e.screenshot ? { ...e, screenshot: replacements.get(e.screenshot) ?? e.screenshot } : e);
    const { error: saveError } = await db.from('test_runs').update({ status: state.status, report: JSON.parse(JSON.stringify(report)) as Json, error: null, finalize_lease_until: null }).eq('id', id).eq('user_id', userId);
    if (saveError) throw new Error('The report could not be saved. Refresh to recover it.');
    return { ...item(row), status: state.status, verdict: report.verdict };
  } catch (e) {
    await db.from('test_runs').update({ finalize_lease_until: null }).eq('id', id).eq('user_id', userId);
    throw e;
  }
}
export async function readReport(userId: string, id: string): Promise<LiveReport | null> {
  const db = await admin();
  const { data: row } = await db.from('test_runs').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  assertOwner(row, userId);
  if (!row?.report) return null;
  const report = row.report as unknown as LiveReport;
  const paths = report.screenshots.filter(s => !s.startsWith('data:'));
  if (paths.some(path => !path.startsWith(`${userId}/${row.id}/`) || path.includes('..'))) throw new Error('Invalid private screenshot path.');
  const replacements = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await db.storage.from('test-captures').createSignedUrls(paths, 3600);
    if (error) throw new Error('Screenshots could not be loaded.');
    for (const capture of data ?? []) if (capture.path && capture.signedUrl) replacements.set(capture.path, capture.signedUrl);
  }
  return { ...report, screenshots: report.screenshots.map(s => replacements.get(s) ?? s), evidence: report.evidence.map(e => e.screenshot ? { ...e, screenshot: replacements.get(e.screenshot) ?? e.screenshot } : e) };
}
