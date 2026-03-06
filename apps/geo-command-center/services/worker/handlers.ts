/**
 * Handler registry for job types.
 * Each handler receives the full job and returns { ok, error?, errors?, logs? }.
 */

import type { JobRow, HandlerResult } from './types'
import { handleRankRefresh } from '../../src/services/worker/rankRefreshHandler'
import { handlePlaceDetailsRefresh } from '../../src/services/worker/placeDetailsRefreshHandler'
import { handleUpsellEval } from '../../src/services/worker/upsellEvalHandler'
import { handleHealthScoreRefresh } from '../../src/services/worker/healthScoreRefreshHandler'
import { handleReportRun } from '../../src/services/worker/reportRunHandler'
import { handleAiQueryRun } from '../../src/services/worker/aiQueryRunHandler'

export type JobHandler = (job: JobRow) => Promise<HandlerResult>

function wrapHandler(
  fn: (payload: Record<string, unknown>, job: JobRow) => Promise<{ ok: boolean; error?: string; errors?: string[]; [k: string]: unknown }>
): JobHandler {
  return async (job) => {
    const result = await fn(job.payload as Record<string, unknown>, job)
    return {
      ok: result.ok,
      error: result.error,
      errors: result.errors,
      logs: (result.logs ?? Object.fromEntries(Object.entries(result).filter(([k]) => !['ok', 'error', 'errors'].includes(k)))) as Record<string, unknown>,
    }
  }
}

export const handlerRegistry: Record<string, JobHandler> = {
  RANK_REFRESH: wrapHandler(async (payload) => {
    const r = await handleRankRefresh(
      { location_id: payload.location_id as string, source: payload.source as string | undefined },
      payload.keyword_ids ? { keywordIds: payload.keyword_ids as string[] } : undefined
    )
    return {
      ok: r.ok,
      processed: r.processed,
      skipped: r.skipped,
      errors: r.errors,
      logs: { processed: r.processed, skipped: r.skipped, errorsCount: r.errors.length },
    }
  }),

  PLACE_DETAILS_REFRESH: wrapHandler(async (payload) => {
    const r = await handlePlaceDetailsRefresh({
      agency_id: payload.agency_id as string | undefined,
      location_id: payload.location_id as string | undefined,
    })
    return { ok: r.ok, processed: r.processed, errors: r.errors }
  }),

  UPSELL_EVAL: wrapHandler(async (payload) => {
    const r = await handleUpsellEval({ agency_id: payload.agency_id as string })
    return {
      ok: r.ok,
      opportunities_created: r.opportunities_created,
      opportunities_skipped: r.opportunities_skipped,
      errors: r.errors,
    }
  }),

  HEALTH_SCORE_REFRESH: wrapHandler(async (payload) => {
    const r = await handleHealthScoreRefresh({ agency_id: payload.agency_id as string })
    return { ok: r.ok, processed: r.processed, errors: r.errors }
  }),

  REPORT_RUN: wrapHandler(async (payload, job) => {
    const r = await handleReportRun({
      schedule_id: payload.schedule_id as string,
      template_id: payload.template_id as string,
      client_id: payload.client_id as string,
      agency_id: (payload.agency_id as string) ?? job.agency_id,
    })
    return { ok: r.ok, error: r.error, runId: r.runId }
  }),

  AI_QUERY_RUN: wrapHandler(async (payload, job) => {
    const r = await handleAiQueryRun({
      ai_query_id: payload.ai_query_id as string,
      agency_id: (payload.agency_id as string) ?? job.agency_id,
      location_id: payload.location_id as string | undefined,
      platform: payload.platform as string | undefined,
      query_text: payload.query_text as string | undefined,
    })
    return { ok: r.ok, error: r.error, runId: r.runId }
  }),
}
