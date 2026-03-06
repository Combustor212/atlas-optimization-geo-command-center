/**
 * RANK_REFRESH worker handler.
 * TODO: Worker will call handleRankRefresh(job) when processing RANK_REFRESH jobs.
 * Heavy logic lives in @/lib/worker/handlers/rank-refresh (runRankRefreshJob).
 */

import { createServiceClient } from '@/lib/supabase/service'
import {
  runRankRefreshJob,
  type RankRefreshPayload,
  type RankRefreshOptions,
} from '@/lib/worker/handlers/rank-refresh'

export type { RankRefreshPayload }

/**
 * Refresh rankings for a single location (all its active keywords).
 * Thin wrapper that delegates to runRankRefreshJob.
 */
export async function handleRankRefresh(
  payload: RankRefreshPayload,
  options?: RankRefreshOptions
): Promise<{ ok: boolean; processed: number; skipped: number; errors: string[] }> {
  const supabase = createServiceClient()
  const result = await runRankRefreshJob(payload, supabase, options)
  return {
    ok: result.errors.length === 0,
    processed: result.processed,
    skipped: result.skipped,
    errors: result.errors,
  }
}
