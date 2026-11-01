import { describe, expect, it } from 'vitest';
import { currentMilestone, formatElapsed, MILESTONES } from '@/lib/milestones';
describe('test progress milestones', () => {
  it('starts on writing the workflow while queued', () => expect(currentMilestone('STARTING', 40, false)).toBe(0));
  it('advances while the browser runs, but never past investigating', () => {
    expect(currentMilestone('RUNNING', 5, false)).toBe(0);
    expect(currentMilestone('RUNNING', 15, false)).toBe(1);
    expect(currentMilestone('RUNNING', 600, false)).toBe(2);
  });
  it('shows report writing once TinyFish finishes', () => expect(currentMilestone('REPORTING', 3, false)).toBe(3));
  it('marks everything done once a verdict exists', () => expect(currentMilestone('COMPLETED', 0, true)).toBe(MILESTONES.length));
  it('formats elapsed time as mm:ss', () => expect(formatElapsed(83)).toBe('01:23'));
});
