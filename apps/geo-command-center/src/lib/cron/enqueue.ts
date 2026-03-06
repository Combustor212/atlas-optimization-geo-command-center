/**
 * Shared enqueue helper for cron routes.
 * Inserts jobs into the jobs table with idempotency_key to avoid duplicates.
 * Workers will claim and process these jobs via claim_jobs().
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type JobType =
  | 'REPORT_RUN'
  | 'AI_QUERY_RUN'
  | 'RANK_REFRESH'
  | 'PLACE_DETAILS_REFRESH'
  | 'UPSELL_EVAL'
  | 'HEALTH_SCORE_REFRESH'

export interface EnqueueParams {
  agency_id: string
  client_id?: string | null
  location_id?: string | null
  job_type: JobType
  payload: Record<string, unknown>
  idempotency_key: string
  run_at?: string
}

export interface EnqueueResult {
  inserted: boolean
  id?: string
}

/**
 * Enqueue a single job. Uses upsert with ignoreDuplicates so duplicate
 * idempotency_key returns inserted: false (duplicate skipped).
 */
export async function enqueueJob(
  supabase: SupabaseClient,
  params: EnqueueParams
): Promise<EnqueueResult> {
  const { data, error } = await supabase
    .from('jobs')
    .upsert(
      {
        agency_id: params.agency_id,
        client_id: params.client_id ?? null,
        location_id: params.location_id ?? null,
        job_type: params.job_type,
        payload: params.payload,
        status: 'queued',
        run_at: params.run_at ?? new Date().toISOString(),
        idempotency_key: params.idempotency_key,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true }
    )
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }
  return {
    inserted: !!data,
    id: data?.id,
  }
}

export interface EnqueueBatchResult {
  enqueued_count: number
  duplicates_skipped: number
  errors: string[]
}
