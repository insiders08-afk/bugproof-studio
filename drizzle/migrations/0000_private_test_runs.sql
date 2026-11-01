CREATE TABLE public.test_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 url text NOT NULL,
 prompt text NOT NULL,
 request_key uuid NOT NULL,
 provider_run_id text,
 status text NOT NULL DEFAULT 'STARTING',
 report jsonb,
 error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, request_key)
);
GRANT SELECT ON public.test_runs TO authenticated;
GRANT ALL ON public.test_runs TO service_role;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own tests" ON public.test_runs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX test_runs_owner_created ON public.test_runs (user_id, created_at DESC);