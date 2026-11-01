import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { runLiveTest, listTests, pollTest, getTestReport, type RunItem } from '@/lib/livetest.functions';
import { repeatInput } from '@/lib/test-goal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAccount } from '@/components/AccountSession';
import { TestReport } from '@/components/TestReport';
import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpRight, ArrowRight, RotateCcw, LogOut, ChevronDown, ChevronUp, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'RealityGate — Website tests, real answers' },
    { name: 'description', content: 'Run website tests in plain English with TinyFish verdicts, screenshots, and private saved reports.' },
    { property: 'og:title', content: 'RealityGate — Website tests, real answers' },
    { property: 'og:description', content: 'Real browser testing, clear TinyFish conclusions, and repeatable test requests.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: Home,
});
const activeStatuses = new Set(['STARTING', 'RUNNING', 'QUEUED', 'PENDING', 'REPORTING', 'IN_PROGRESS']);
function Home() {
  const { user, ready } = useAccount();
  const queryClient = useQueryClient();
  const run = useServerFn(runLiveTest);
  const list = useServerFn(listTests);
  const poll = useServerFn(pollTest);
  const [url, setUrl] = useState('https://');
  const [prompt, setPrompt] = useState('');
  const [starting, setStarting] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const history = useQuery({ queryKey: ['tests', user?.id], queryFn: () => list(), enabled: Boolean(user), refetchInterval: 8000 });
  const rows: RunItem[] = history.data ?? [];
  const active = rows.filter(r => activeStatuses.has(r.status));
  const progress = useQuery({ queryKey: ['test-progress', user?.id, active.map(r => r.id).join(',')], enabled: Boolean(user) && active.length > 0,
    queryFn: async () => { const result = await Promise.all(active.map(r => poll({ data: { id: r.id } }))); await queryClient.invalidateQueries({ queryKey: ['tests', user?.id] }); return result; }, refetchInterval: 5000, retry: 1 });
  async function signIn() {
    setError('');
    try {
      const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
      if (result.error) setError(result.error.message || 'Google sign-in could not be completed.');
    } catch { setError('Google sign-in could not be completed. Please try again.'); }
  }
  async function signOut() {
    await queryClient.cancelQueries(); queryClient.clear();
    setOpen(null); setError(''); setUrl('https://'); setPrompt('');
    await supabase.auth.signOut();
  }
  async function start(input: {url: string; prompt: string}) {
    if (lock.current || !user) return;
    lock.current = true; setStarting(true); setError('');
    try {
      const r = await run({ data: { ...input, requestKey: crypto.randomUUID() } });
      setOpen(r.id);
      await queryClient.invalidateQueries({ queryKey: ['tests', user.id] });
      if (r.error) setError(r.error);
    } catch (e) { setError(e instanceof Error ? e.message : 'Test startup was interrupted. Check saved tests before repeating.'); }
    finally { lock.current = false; setStarting(false); }
  }
  return <div className="mx-auto max-w-4xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
    <header className="flex items-center justify-between gap-3 border-b-2 border-border pb-5">
      <Link to="/" className="flex items-center gap-2 font-mono text-sm font-semibold"><span className="brand-mark" aria-hidden="true">R/G</span><span className="hidden sm:inline">REALITYGATE</span></Link>
      <nav className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link to="/lab">Lab<ArrowUpRight /></Link></Button>{ready && (user ? <Button variant="outline" size="sm" onClick={signOut}><LogOut />Sign out</Button> : <Button variant="outline" size="sm" onClick={signIn}>Sign in<ArrowRight /></Button>)}</nav>
    </header>
    <section className="pb-8 pt-10 sm:pt-14"><p className="mb-3 font-mono text-xs font-semibold uppercase text-secondary">RealityGate</p><h1 className="text-4xl font-bold leading-tight sm:text-5xl">Website tests.<br /><span className="text-primary">Real answers.</span></h1></section>
    <form onSubmit={e => { e.preventDefault(); void start({ url: url.trim(), prompt: prompt.trim() }); }} className="space-y-4 border-y-2 border-border py-6">
      <div><label htmlFor="website-url" className="mb-2 block font-mono text-xs font-semibold uppercase">Website URL</label><Input id="website-url" type="url" required maxLength={2000} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="h-12 border-2 bg-card font-mono text-sm" /></div>
      <div><label htmlFor="test-prompt" className="mb-2 block font-mono text-xs font-semibold uppercase">What should we test?</label><Textarea id="test-prompt" required maxLength={2000} rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Open the pricing page and check that a Pro plan appears." className="border-2 bg-card text-sm" /></div>
      {user ? <Button type="submit" size="lg" className="brutal-button h-12 w-full" disabled={starting || prompt.trim().length < 3}>{starting ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}{starting ? 'Starting test…' : 'Run test'}</Button> : <Button type="button" size="lg" className="brutal-button h-12 w-full" disabled={!ready} onClick={signIn}>Continue with Google<ArrowRight /></Button>}
      {(error || history.error || progress.error) && <p role="alert" className="break-words text-sm text-destructive">{error || (history.error instanceof Error ? history.error.message : '') || 'Progress could not be refreshed. Your saved test is still available.'}</p>}
    </form>
    <section className="pt-10"><div className="mb-4 flex items-center justify-between"><h2 className="font-mono text-xs font-semibold uppercase">Past tests</h2><span className="font-mono text-xs text-muted-foreground">{user ? String(rows.length).padStart(2, '0') : '—'}</span></div>
      {!user && <p className="text-sm text-muted-foreground">Sign in to view your tests.</p>}
      {user && history.isPending && <p role="status" className="text-sm text-muted-foreground">Loading your tests…</p>}
      {user && !history.isPending && rows.length === 0 && <p className="text-sm text-muted-foreground">No tests yet.</p>}
      <div className="space-y-4">{user && rows.map(r => <article key={r.id} className="border-2 border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 p-4"><Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start gap-3 whitespace-normal p-0 text-left hover:bg-transparent" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
          <span className={cn('shrink-0 border-2 border-border px-2 py-1 font-mono text-[11px] font-semibold', r.verdict === 'PASS' ? 'bg-primary text-primary-foreground' : r.verdict === 'FAILED' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-foreground')}>{r.verdict ?? (activeStatuses.has(r.status) ? 'RUNNING' : 'INCONCLUSIVE')}</span>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{r.prompt}</span><span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">{r.url}</span></span>{open === r.id ? <ChevronUp /> : <ChevronDown />}</Button>
          <Button variant="outline" size="sm" onClick={() => { setUrl(r.url); setPrompt(r.prompt); void start(repeatInput(r)); }} disabled={starting || activeStatuses.has(r.status)}><RotateCcw />Repeat test</Button>
        </div>
        {open === r.id && <RunDetails run={r} userId={user.id} />}
      </article>)}</div>
    </section>
    <footer className="mt-12 border-t-2 border-border pt-5 font-mono text-xs text-muted-foreground">REALITYGATE <span className="float-right">POWERED BY TINYFISH</span></footer>
  </div>;
}
function RunDetails({ run, userId }: { run: RunItem; userId: string }) {
  const getReport = useServerFn(getTestReport);
  const report = useQuery({ queryKey: ['test-report', userId, run.id, run.verdict], queryFn: () => getReport({ data: { id: run.id } }), enabled: Boolean(run.verdict), staleTime: 30 * 60_000 });
  if (report.data) return <TestReport r={report.data} />;
  return <div className="border-t-2 border-border p-5 text-sm">{report.error ? <p role="alert">The report could not be loaded. <Button variant="link" onClick={() => report.refetch()}>Try again</Button></p> : run.error ? <p className="break-words text-destructive">{run.error}</p> : <><p role="status" className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />{run.status === 'REPORTING' || run.verdict ? 'Preparing report…' : 'TinyFish is investigating…'}</p><p className="mt-2 font-mono text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p></>}</div>;
}
