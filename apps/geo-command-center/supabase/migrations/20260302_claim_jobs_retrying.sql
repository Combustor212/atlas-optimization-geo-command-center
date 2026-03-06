-- Allow claim_jobs to also claim 'retrying' jobs when run_at has passed
CREATE OR REPLACE FUNCTION public.claim_jobs(worker_id TEXT, limit_n INT DEFAULT 5)
RETURNS SETOF jobs
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH to_claim AS (
    SELECT j.id FROM jobs j
    WHERE j.status IN ('queued', 'retrying') AND j.run_at <= now()
    ORDER BY j.priority DESC, j.run_at ASC
    LIMIT limit_n
    FOR UPDATE OF j SKIP LOCKED
  )
  UPDATE jobs j
  SET
    status = 'running',
    locked_at = now(),
    locked_by = worker_id,
    attempts = j.attempts + 1,
    updated_at = now()
  FROM to_claim t
  WHERE j.id = t.id
  RETURNING j.*;
END;
$$;
