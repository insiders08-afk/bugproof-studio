import { describe, expect, it } from 'vitest';
import { repeatInput } from '@/lib/test-goal';
import { assertOwner } from '@/lib/test-runs.server';

describe('Repeat requests and private tests', () => {
  it('repeats the original website and instructions, not a generated replay', () => {
    expect(repeatInput({ url: 'https://bookmyboxcric.lovable.app', prompt: 'Open the first venue and check booking.' })).toEqual({ url: 'https://bookmyboxcric.lovable.app', prompt: 'Open the first venue and check booking.' });
  });
  it('only authorizes the verified owner of a saved test', () => {
    expect(() => assertOwner({ user_id: 'owner-a' }, 'owner-b')).toThrow('Test not found.');
    expect(() => assertOwner({ user_id: 'owner-a' }, 'owner-a')).not.toThrow();
    expect(() => assertOwner(null, 'owner-a')).toThrow('Test not found.');
  });
});