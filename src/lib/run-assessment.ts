export type ExecutionStatus = 'COMPLETED' | 'BLOCKED' | 'TIMED_OUT' | 'INFRA_ERROR' | 'CANCELLED';
export type RequirementVerdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'NOT_EVALUATED';
export const FAILURE_CLASSES = ['APP_REGRESSION', 'EXPECTED_NEGATIVE', 'AUTH_FAILURE', 'BOT_CHALLENGE', 'TEST_FAILURE', 'INFRA_FAILURE'] as const;
export type FailureClass = typeof FAILURE_CLASSES[number];
export type RunAssessment = { executionStatus: ExecutionStatus; requirementVerdict: RequirementVerdict; failureClass: FailureClass | null };

/** Provider observations establish requirement results, not independently verified regressions. */
export function assessRun(input: {
  status: string; outcome: string; requirementMet: string;
  failureClass?: FailureClass; failureEvidence?: string;
}): RunAssessment {
  const status = input.status.toUpperCase();
  const executionStatus: ExecutionStatus = status === 'CANCELLED' ? 'CANCELLED'
    : status === 'TIMED_OUT' || status === 'TIMEOUT' ? 'TIMED_OUT'
    : status === 'BLOCKED' || (status === 'COMPLETED' && input.outcome === 'blocked') ? 'BLOCKED'
    : status === 'COMPLETED' ? 'COMPLETED' : 'INFRA_ERROR';
  const requirementVerdict: RequirementVerdict = executionStatus !== 'COMPLETED' ? 'NOT_EVALUATED'
    : input.outcome === 'success' && input.requirementMet === 'yes' ? 'PASS'
    : (input.outcome === 'success' || input.outcome === 'failure') && input.requirementMet === 'no' ? 'FAIL'
    : input.outcome === 'failure' && input.requirementMet === 'unknown' ? 'FAIL' : 'INCONCLUSIVE';
  let failureClass: FailureClass | null = null;
  if (executionStatus === 'INFRA_ERROR') failureClass = 'INFRA_FAILURE';
  else if (input.failureEvidence?.trim() && input.failureClass && input.failureClass !== 'APP_REGRESSION'
    && (requirementVerdict !== 'PASS' || input.failureClass === 'EXPECTED_NEGATIVE')) failureClass = input.failureClass;
  else if (requirementVerdict === 'FAIL') failureClass = 'TEST_FAILURE';
  return { executionStatus, requirementVerdict, failureClass };
}

export type ProgressObservation = { state: string; action: string; afterState: string };
export const INVESTIGATION_BUDGET = { durationSeconds: 180, maxActions: 30, maxModelCalls: 40, maxRecoveryAttempts: 2 } as const;
/** Same action in the same state without a transition; revisits with progress are legitimate. */
export function detectNoProgress(history: ProgressObservation[], threshold = 3): boolean {
  const recent = history.slice(-12);
  const last = recent.at(-1);
  if (!last || last.state !== last.afterState) return false;
  return recent.filter(step => step.state === last.state && step.action === last.action && step.afterState === last.state).length >= threshold;
}