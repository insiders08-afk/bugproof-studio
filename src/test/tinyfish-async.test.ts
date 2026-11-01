import { afterEach, expect, it, vi } from 'vitest';
import { fetchTinyFishStatus, startTinyFishAgent } from '@/lib/tinyfish';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('starts exactly one asynchronous browser run and returns its identifier', async () => {
  vi.stubEnv('TINYFISH_API_KEY', 'test-only');
  const fetcher = vi.fn(async () => Response.json({ run_id: 'run-123' })); vi.stubGlobal('fetch', fetcher);
  expect(await startTinyFishAgent('https://example.com', 'Check title')).toBe('run-123');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://agent.tinyfish.ai/v1/automation/run-async');
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toMatchObject({ url: 'https://example.com', goal: 'Check title', capture_config: { screenshots: true }, agent_config: { max_duration_seconds: 180 } });
});
it('never retries an ambiguous billable start', async () => {
  vi.stubEnv('TINYFISH_API_KEY', 'test-only');
  const fetcher = vi.fn(async () => { throw new Error('connection lost'); }); vi.stubGlobal('fetch', fetcher);
  await expect(startTinyFishAgent('https://example.com', 'Check title')).rejects.toThrow('connection lost');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('polls the same run without initiating or cancelling another run', async () => {
  vi.stubEnv('TINYFISH_API_KEY', 'test-only');
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 'COMPLETED', result: { outcome: 'success' } })));
  expect(await fetchTinyFishStatus('run-123')).toEqual({ status: 'COMPLETED', result: { outcome: 'success' } });
  expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain('/v1/runs/run-123?');
  expect(vi.mocked(fetch).mock.calls[0]?.[1]?.method).toBeUndefined();
});