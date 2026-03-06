#!/usr/bin/env npx tsx
/**
 * Long-running job worker for geo-command-center.
 * Polls jobs via public.claim_jobs(worker_id, limit_n), processes with handlers,
 * writes job_runs, updates job status with exponential backoff.
 */

import 'dotenv/config'
import { createServiceClient } from '@/lib/supabase/service'
import { handlerRegistry } from './handlers'
import type { JobRow } from './types'

const CONCURRENCY = 5
const POLL_INTERVAL_MS = 5_000
const POLL_INTERVAL_EMPTY_MS = 15_000
const BASE_BACKOFF_MS = 60_000
const MAX_BACKOFF_MS = 900_000
const MAX_ATTEMPTS = 5

const workerId = `worker-${process.env.HOSTNAME ?? 'local'}-${Date.now().toString(36)}`

function log(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    worker_id: workerId,
    msg,
    ...meta,
  }
  console.log(JSON.stringify(entry))
}

function withJitter(ms: number): number {
  const jitter = Math.random() * 0.3 * ms
  return Math.floor(ms + jitter)
}

function nextRunAt(attempt: number): string {
  const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS)
  const withJitterMs = withJitter(backoff)
  const at = new Date(Date.now() + withJitterMs)
  return at.toISOString()
}

async function claimJobs(supabase: ReturnType<typeof createServiceClient>): Promise<JobRow[]> {
  const { data, error } = await supabase.rpc('claim_jobs', {
    worker_id: workerId,
    limit_n: CONCURRENCY,
  })
  if (error) {
    log('error', 'claim_jobs failed', { error: error.message })
    return []
  }
  return (data ?? []) as JobRow[]
}

async function createJobRun(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  attemptNo: number
): Promise<string | null> {
  const { data, error } = await supabase
    .from('job_runs')
    .insert({
      job_id: jobId,
      attempt_no: attemptNo,
      status: 'running',
    })
    .select('id')
    .single()
  if (error) {
    log('error', 'job_runs insert failed', { job_id: jobId, error: error.message })
    return null
  }
  return data?.id ?? null
}

async function finishJobRun(
  supabase: ReturnType<typeof createServiceClient>,
  runId: string,
  status: 'succeeded' | 'failed',
  error?: string,
  logs?: Record<string, unknown>
) {
  await supabase
    .from('job_runs')
    .update({
      finished_at: new Date().toISOString(),
      status,
      error: error ?? null,
      logs: logs ?? {},
    })
    .eq('id', runId)
}

async function updateJobStatus(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  status: 'succeeded' | 'failed' | 'retrying' | 'dead',
  lastError?: string,
  runAt?: string
) {
  const update: Record<string, unknown> = {
    status,
    last_error: lastError ?? null,
    updated_at: new Date().toISOString(),
  }
  if (status === 'retrying' && runAt) {
    update.run_at = runAt
  }
  await supabase.from('jobs').update(update).eq('id', jobId)
}

async function processJob(job: JobRow): Promise<void> {
  const supabase = createServiceClient()
  const handler = handlerRegistry[job.job_type as keyof typeof handlerRegistry]
  if (!handler) {
    log('error', 'Unknown job type', { job_id: job.id, job_type: job.job_type })
    await updateJobStatus(supabase, job.id, 'failed', `Unknown job type: ${job.job_type}`)
    return
  }

  const runId = await createJobRun(supabase, job.id, job.attempts)
  if (!runId) return

  try {
    const result = await handler(job)
    if (result.ok) {
      await finishJobRun(supabase, runId, 'succeeded', undefined, result.logs)
      await updateJobStatus(supabase, job.id, 'succeeded')
      log('info', 'Job succeeded', { job_id: job.id, job_type: job.job_type, run_id: runId })
    } else {
      const errMsg = result.error ?? result.errors?.join('; ') ?? 'Handler returned ok: false'
      await finishJobRun(supabase, runId, 'failed', errMsg, result.logs)
      const nextAttempt = job.attempts + 1
      const isDead = nextAttempt >= (job.max_attempts ?? MAX_ATTEMPTS)
      if (isDead) {
        await updateJobStatus(supabase, job.id, 'dead', errMsg)
        log('warn', 'Job dead', { job_id: job.id, job_type: job.job_type, attempts: job.attempts })
      } else {
        const runAt = nextRunAt(job.attempts)
        await updateJobStatus(supabase, job.id, 'retrying', errMsg, runAt)
        log('warn', 'Job retrying', { job_id: job.id, job_type: job.job_type, run_at: runAt })
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    await finishJobRun(supabase, runId, 'failed', errMsg)
    const nextAttempt = job.attempts + 1
    const isDead = nextAttempt >= (job.max_attempts ?? MAX_ATTEMPTS)
    if (isDead) {
      await updateJobStatus(supabase, job.id, 'dead', errMsg)
      log('error', 'Job dead (exception)', { job_id: job.id, job_type: job.job_type, error: errMsg })
    } else {
      const runAt = nextRunAt(job.attempts)
      await updateJobStatus(supabase, job.id, 'retrying', errMsg, runAt)
      log('warn', 'Job retrying (exception)', { job_id: job.id, job_type: job.job_type, error: errMsg })
    }
  }
}

async function runPollCycle(): Promise<number> {
  const supabase = createServiceClient()
  const jobs = await claimJobs(supabase)
  if (jobs.length === 0) return 0
  log('info', 'Claimed jobs', { count: jobs.length, job_ids: jobs.map((j) => j.id) })
  await Promise.all(jobs.map((j) => processJob(j)))
  return jobs.length
}

async function main() {
  log('info', 'Worker starting', { concurrency: CONCURRENCY })
  let emptyCount = 0

  for (;;) {
    try {
      const claimed = await runPollCycle()
      if (claimed > 0) {
        emptyCount = 0
      } else {
        emptyCount++
      }
      const interval = claimed > 0 ? POLL_INTERVAL_MS : POLL_INTERVAL_EMPTY_MS
      await new Promise((r) => setTimeout(r, interval))
    } catch (e) {
      log('error', 'Poll cycle error', { error: e instanceof Error ? e.message : String(e) })
      await new Promise((r) => setTimeout(r, withJitter(POLL_INTERVAL_MS)))
    }
  }
}

main().catch((e) => {
  log('error', 'Worker fatal', { error: e instanceof Error ? e.message : String(e) })
  process.exit(1)
})
