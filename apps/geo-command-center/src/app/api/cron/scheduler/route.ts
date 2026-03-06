import { NextResponse } from 'next/server'
import { getISOWeek, getISOWeekYear } from 'date-fns'
import { requireCronAuth } from '@/lib/cron/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  getLocalParts,
  formatIdempotencyTime,
  isReportScheduleDue,
  getRunAtBucket,
} from '@/lib/cron/scheduler-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type JobType =
  | 'REPORT_RUN'
  | 'AI_QUERY_RUN'
  | 'RANK_REFRESH'
  | 'PLACE_DETAILS_REFRESH'
  | 'UPSELL_EVAL'
  | 'HEALTH_SCORE_REFRESH'

interface SchedulerResult {
  enqueued: Record<JobType, number>
  duplicates_skipped: number
  errors: string[]
}

function emptyCounts(): Record<JobType, number> {
  return {
    REPORT_RUN: 0,
    AI_QUERY_RUN: 0,
    RANK_REFRESH: 0,
    PLACE_DETAILS_REFRESH: 0,
    UPSELL_EVAL: 0,
    HEALTH_SCORE_REFRESH: 0,
  }
}

export async function GET(req: Request) {
  try {
    requireCronAuth(req)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()
  const result: SchedulerResult = {
    enqueued: emptyCounts(),
    duplicates_skipped: 0,
    errors: [],
  }

  // --- A) REPORT_RUN ---
  const { data: schedules, error: schedError } = await supabase
    .from('report_schedules')
    .select('id, agency_id, client_id, template_id, time_of_day, timezone, frequency, day_of_week, day_of_month')
    .eq('is_active', true)

  if (!schedError && schedules?.length) {
    for (const sched of schedules) {
      if (!isReportScheduleDue(sched, now)) continue

      const tz = sched.timezone || 'America/New_York'
      const parts = getLocalParts(now, tz)
      const timeBucket = formatIdempotencyTime(parts)
      const idempotencyKey = `REPORT_RUN:${sched.id}:${timeBucket}`
      const runAt = getRunAtBucket(now)

      // Insert report_runs only if not already created for this time bucket
      const { data: existingRun } = await supabase
        .from('report_runs')
        .select('id')
        .eq('agency_id', sched.agency_id)
        .eq('client_id', sched.client_id)
        .eq('template_id', sched.template_id)
        .eq('run_at', runAt)
        .limit(1)
        .maybeSingle()

      if (!existingRun) {
        const { error: runErr } = await supabase.from('report_runs').insert({
          agency_id: sched.agency_id,
          client_id: sched.client_id,
          template_id: sched.template_id,
          status: 'queued',
          run_at: runAt,
        })

        if (runErr) {
          result.errors.push(`REPORT_RUN report_runs ${sched.id}: ${runErr.message}`.slice(0, 120))
        }
      }

      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .upsert(
          {
            agency_id: sched.agency_id,
            client_id: sched.client_id,
            job_type: 'REPORT_RUN',
            payload: {
              schedule_id: sched.id,
              template_id: sched.template_id,
              client_id: sched.client_id,
            },
            status: 'queued',
            run_at: runAt,
            idempotency_key: idempotencyKey,
          },
          { onConflict: 'idempotency_key', ignoreDuplicates: true }
        )
        .select('id')
        .maybeSingle()

      if (jobErr) {
        result.errors.push(`REPORT_RUN job ${sched.id}: ${jobErr.message}`.slice(0, 120))
      } else if (jobData) {
        result.enqueued.REPORT_RUN++
      } else {
        result.duplicates_skipped++
      }
    }
  } else if (schedError) {
    result.errors.push(`report_schedules: ${schedError.message}`.slice(0, 120))
  }

  // --- B) AI_QUERY_RUN ---
  const { data: queries, error: qErr } = await supabase
    .from('ai_queries')
    .select('id, agency_id, location_id, platform, query_text, frequency')
    .eq('is_active', true)

  if (!qErr && queries?.length) {
    const isoWeek = getISOWeek(now)
    const isoWeekYear = getISOWeekYear(now)
    const weekBucket = `${isoWeekYear}-W${String(isoWeek).padStart(2, '0')}`
    const monthBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    for (const q of queries) {
      const bucket = q.frequency === 'monthly' ? monthBucket : weekBucket
      const idempotencyKey = `AI_QUERY_RUN:${q.id}:${bucket}`

      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .upsert(
          {
            agency_id: q.agency_id,
            location_id: q.location_id,
            job_type: 'AI_QUERY_RUN',
            payload: {
              ai_query_id: q.id,
              platform: q.platform,
              query_text: q.query_text,
              location_id: q.location_id,
            },
            status: 'queued',
            run_at: now.toISOString(),
            idempotency_key: idempotencyKey,
          },
          { onConflict: 'idempotency_key', ignoreDuplicates: true }
        )
        .select('id')
        .maybeSingle()

      if (jobErr) {
        result.errors.push(`AI_QUERY_RUN ${q.id}: ${jobErr.message}`.slice(0, 120))
      } else if (jobData) {
        result.enqueued.AI_QUERY_RUN++
      } else {
        result.duplicates_skipped++
      }
    }
  } else if (qErr) {
    result.errors.push(`ai_queries: ${qErr.message}`.slice(0, 120))
  }

  // --- C) RANK_REFRESH ---
  const { data: keywordPairs, error: kwErr } = await supabase
    .from('location_keywords')
    .select('location_id, agency_id')
    .eq('is_active', true)

  if (!kwErr && keywordPairs?.length) {
    const locationIds = Array.from(new Set(keywordPairs.map((p) => p.location_id)))
    const locToAgency = new Map(keywordPairs.map((p) => [p.location_id, p.agency_id]))
    const dateBucket = now.toISOString().slice(0, 10) // YYYY-MM-DD

    for (const locationId of locationIds) {
      const agencyId = locToAgency.get(locationId)
      if (!agencyId) continue

      const idempotencyKey = `RANK_REFRESH:${locationId}:${dateBucket}`

      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .upsert(
          {
            agency_id: agencyId,
            location_id: locationId,
            job_type: 'RANK_REFRESH',
            payload: { location_id: locationId },
            status: 'queued',
            run_at: now.toISOString(),
            idempotency_key: idempotencyKey,
          },
          { onConflict: 'idempotency_key', ignoreDuplicates: true }
        )
        .select('id')
        .maybeSingle()

      if (jobErr) {
        result.errors.push(`RANK_REFRESH ${locationId}: ${jobErr.message}`.slice(0, 120))
      } else if (jobData) {
        result.enqueued.RANK_REFRESH++
      } else {
        result.duplicates_skipped++
      }
    }
  } else if (kwErr) {
    result.errors.push(`location_keywords: ${kwErr.message}`.slice(0, 120))
  }

  // --- D) PLACE_DETAILS_REFRESH, UPSELL_EVAL, HEALTH_SCORE_REFRESH (per agency, daily) ---
  const { data: agencies, error: agencyErr } = await supabase
    .from('agencies')
    .select('id')

  if (!agencyErr && agencies?.length) {
    const dateBucket = now.toISOString().slice(0, 10)

    const types: Array<{ type: JobType; keyPrefix: string }> = [
      { type: 'PLACE_DETAILS_REFRESH', keyPrefix: 'PLACE_DETAILS_REFRESH' },
      { type: 'UPSELL_EVAL', keyPrefix: 'UPSELL_EVAL' },
      { type: 'HEALTH_SCORE_REFRESH', keyPrefix: 'HEALTH_SCORE_REFRESH' },
    ]

    for (const agency of agencies) {
      for (const { type, keyPrefix } of types) {
        const idempotencyKey = `${keyPrefix}:${agency.id}:${dateBucket}`

        const { data: jobData, error: jobErr } = await supabase
          .from('jobs')
          .upsert(
            {
              agency_id: agency.id,
              job_type: type,
              payload: {},
              status: 'queued',
              run_at: now.toISOString(),
              idempotency_key: idempotencyKey,
            },
            { onConflict: 'idempotency_key', ignoreDuplicates: true }
          )
          .select('id')
          .maybeSingle()

        if (jobErr) {
          result.errors.push(`${type} ${agency.id}: ${jobErr.message}`.slice(0, 120))
        } else if (jobData) {
          result.enqueued[type]++
        } else {
          result.duplicates_skipped++
        }
      }
    }
  } else if (agencyErr) {
    result.errors.push(`agencies: ${agencyErr.message}`.slice(0, 120))
  }

  return NextResponse.json(result)
}
