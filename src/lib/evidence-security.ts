const sensitiveKey = /^(?:password|passwd|secret|token|access_token|refresh_token|id_token|api[_-]?key|authorization|cookie|session|sessionid|code|credential|client_secret)$/i;
const assignment = /\b(password|passwd|secret|token|access_token|refresh_token|api[_-]?key|authorization|cookie|client_secret)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
const bearer = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const jwt = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const opaqueKey = /\b(?:sk_live_|sk_test_|sb_secret_|sk-proj-|ghp_|github_pat_)[A-Za-z0-9_-]+\b/g;
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const paymentNumber = /\b(?:\d[ -]?){13,19}\b/g;
export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = ''; url.password = '';
    for (const key of [...url.searchParams.keys()]) {
      // Query values and fragments are not needed as evidence and may carry credentials/PII.
      url.searchParams.set(key, '[REDACTED]');
    }
    if (url.hash) url.hash = '[REDACTED]';
    return url.toString();
  } catch { return '[invalid URL]'; }
}
export function redactText(value: string): string {
  return value.replace(/https?:\/\/[^\s<>"']+/g, sanitizeUrl)
    .replace(assignment, '$1=[REDACTED]').replace(bearer, 'Bearer [REDACTED]')
    .replace(jwt, '[REDACTED]').replace(opaqueKey, '[REDACTED]')
    .replace(email, '[REDACTED EMAIL]').replace(paymentNumber, '[REDACTED NUMBER]');
}
export function hasSensitiveMaterial(value: string): boolean {
  // Check patterns without stateful global regex .test().
  return redactText(value) !== value || /\b(password|credit card|card number|cvv|cvc|one.time password|recovery code|access token|refresh token)\b/i.test(value);
}
export function assertSafeTestInput(input: { url: string; prompt: string }) {
  const url = new URL(input.url);
  if (url.username || url.password || [...url.searchParams.keys()].some(key => sensitiveKey.test(key))
    || hasSensitiveMaterial(url.pathname + url.hash) || hasSensitiveMaterial(input.prompt)) {
    throw new Error('Do not include credentials, tokens or personal data in a test request. Saved authenticated sessions are not supported yet.');
  }
}
/** Sanitize only textual observations; pixels must be separately withheld or redacted. */
export function sanitizeEvidence<T>(value: T): T {
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return item.startsWith('data:image/') ? item : redactText(item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, v]) => [key, sensitiveKey.test(key) ? '[REDACTED]' : visit(v)]));
    return item;
  };
  return visit(value) as T;
}
export function assertPrivateCapturePath(path: string, userId: string, runId: string) {
  if (!path.startsWith(`${userId}/${runId}/`) || !/^[A-Za-z0-9_/-]+\.(?:png|jpeg|webp)$/.test(path) || path.includes('..')) throw new Error('Invalid private screenshot path.');
}