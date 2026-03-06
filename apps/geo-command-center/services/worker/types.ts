type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'retrying' | 'canceled' | 'dead'
type JobType =
  | 'REPORT_RUN'
  | 'AI_QUERY_RUN'
  | 'RANK_REFRESH'
  | 'PLACE_DETAILS_REFRESH'
  | 'UPSELL_EVAL'
  | 'HEALTH_SCORE_REFRESH'

export interface JobRow {
  id: string
  agency_id: string
  client_id: string | null
  location_id: string | null
  job_type: JobType
  payload: Record<string, unknown>
  status: JobStatus
  priority: number
  run_at: string
  idempotency_key: string
  locked_at: string | null
  locked_by: string | null
  attempts: number
  max_attempts: number
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface HandlerResult {
  ok: boolean
  error?: string
  errors?: string[]
  logs?: Record<string, unknown>
}
