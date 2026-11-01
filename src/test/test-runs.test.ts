import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), start: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('@/lib/tinyfish', () => ({ startTinyFishAgent: mocks.start, fetchTinyFishStatus: vi.fn(), fetchTinyFishArtifacts: vi.fn() }));
import { startRun, readReport, refreshRun } from '@/lib/test-runs.server';
afterEach(() => vi.clearAllMocks());
function chain(result: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => result) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  return query;
}
describe('Durable private requests', () => {
  it('returns the saved request instead of issuing a second billable launch', async () => {
    const query = chain({ data: { id: 'saved-id', user_id: 'owner', url: 'https://example.com', prompt: 'Check page', status: 'RUNNING', created_at: '2026-11-01', report: null, error: null }, error: null });
    mocks.from.mockReturnValue(query);
    const result = await startRun('owner', { url: 'https://example.com', prompt: 'Check page', requestKey: 'same-request-key' });
    expect(result.id).toBe('saved-id');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(query.eq).toHaveBeenCalledWith('request_key', 'same-request-key');
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it('does not launch a test when the history lookup fails', async () => {
    mocks.from.mockReturnValue(chain({ data: null, error: { message: 'unavailable' } }));
    await expect(startRun('owner', { url: 'https://example.com', prompt: 'Check page', requestKey: 'key' })).rejects.toThrow('could not be checked');
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it('scopes report and progress reads to the verified owner and rejects missing rows', async () => {
    const query = chain({ data: null, error: null }); mocks.from.mockReturnValue(query);
    await expect(readReport('owner-b', 'private-test')).rejects.toThrow('Test not found');
    await expect(refreshRun('owner-b', 'private-test')).rejects.toThrow('Test not found');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'owner-b');
    expect(mocks.start).not.toHaveBeenCalled();
  });
});