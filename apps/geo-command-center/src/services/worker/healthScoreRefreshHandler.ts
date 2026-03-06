/**
 * HEALTH_SCORE_REFRESH worker handler.
 * TODO: Worker will call handleHealthScoreRefresh(job) when processing HEALTH_SCORE_REFRESH jobs.
 * Extracted from apps/geo-command-center/src/app/api/cron/health-scores/route.ts
 */

import { createServiceClient } from '@/lib/supabase/service'
import { computeHealthScore } from '@/lib/health/compute'

export interface HealthScoreRefreshPayload {
  agency_id: string
}

/**
 * Refresh health scores for all clients in an agency.
 * Computes score per client (and per location if client has locations), inserts into health_scores.
 */
export async function handleHealthScoreRefresh(payload: HealthScoreRefreshPayload): Promise<{
  ok: boolean
  processed: number
  errors: string[]
}> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let processed = 0

  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, agency_id')
    .eq('agency_id', payload.agency_id)
    .limit(200)

  if (clientsErr || !clients?.length) {
    return { ok: !clientsErr, processed: 0, errors: clientsErr ? [clientsErr.message] : [] }
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, client_id')
    .in('client_id', clients.map((c) => c.id))

  const clientLocs = new Map<string, { id: string }[]>()
  for (const loc of locations ?? []) {
    const list = clientLocs.get(loc.client_id) ?? []
    list.push({ id: loc.id })
    clientLocs.set(loc.client_id, list)
  }

  for (const client of clients) {
    const locs = clientLocs.get(client.id) ?? []
    if (locs.length === 0) {
      try {
        const result = await computeHealthScore(supabase, client.agency_id, client.id, null)
        const { error: insErr } = await supabase.from('health_scores').insert({
          agency_id: client.agency_id,
          client_id: client.id,
          location_id: null,
          score: result.score,
          band: result.band,
          factors: result.factors as unknown as Record<string, unknown>,
        })
        if (!insErr) processed++
        else errors.push(`client ${client.id}: ${insErr.message}`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`client ${client.id}: ${msg}`)
      }
      continue
    }

    for (const loc of locs) {
      try {
        const result = await computeHealthScore(supabase, client.agency_id, client.id, loc.id)
        const { error: insErr } = await supabase.from('health_scores').insert({
          agency_id: client.agency_id,
          client_id: client.id,
          location_id: loc.id,
          score: result.score,
          band: result.band,
          factors: result.factors as unknown as Record<string, unknown>,
        })
        if (!insErr) processed++
        else errors.push(`loc ${loc.id}: ${insErr.message}`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`loc ${loc.id}: ${msg}`)
      }
    }
  }

  return { ok: errors.length === 0, processed, errors }
}
