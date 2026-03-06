/**
 * UPSELL_EVAL worker handler.
 * TODO: Worker will call handleUpsellEval(job) when processing UPSELL_EVAL jobs.
 * Extracted from apps/geo-command-center/src/app/api/cron/upsells/route.ts
 */

import { createServiceClient } from '@/lib/supabase/service'
import { evaluateCondition, isLocationMetric, isClientMetric } from '@/lib/upsells/evaluator'
import { getOpenOpportunitiesForClient, createUpsellOpportunity } from '@/lib/data/upsells'
import type { UpsellTrigger } from '@/lib/upsells/types'

export interface UpsellEvalPayload {
  agency_id: string
}

/**
 * Evaluate upsell triggers for an agency's clients.
 * Checks each active trigger against each client/location, creates opportunities when conditions pass.
 */
export async function handleUpsellEval(payload: UpsellEvalPayload): Promise<{
  ok: boolean
  opportunities_created: number
  opportunities_skipped: number
  errors: string[]
}> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let opportunitiesCreated = 0
  let opportunitiesSkipped = 0

  const { data: triggers, error: trigError } = await supabase
    .from('upsell_triggers')
    .select('*')
    .eq('agency_id', payload.agency_id)
    .eq('is_active', true)
    .limit(200)

  if (trigError || !triggers?.length) {
    return { ok: !trigError, opportunities_created: 0, opportunities_skipped: 0, errors: trigError ? [trigError.message] : [] }
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('agency_id', payload.agency_id)

  if (!clients?.length) {
    return { ok: true, opportunities_created: 0, opportunities_skipped: 0, errors: [] }
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, client_id')
    .in('client_id', clients.map((c) => c.id))

  const clientLocations = new Map<string, { id: string }[]>()
  for (const loc of locations ?? []) {
    const list = clientLocations.get(loc.client_id) ?? []
    list.push({ id: loc.id })
    clientLocations.set(loc.client_id, list)
  }

  for (const trigger of triggers as (UpsellTrigger & { condition: Record<string, unknown> })[]) {
    const condition = trigger.condition as {
      metric: string
      op: string
      value: unknown
      windowDays?: number
    }
    const metric = condition?.metric
    if (!metric) continue

    for (const client of clients) {
      if (isLocationMetric(metric)) {
        const locs = clientLocations.get(client.id) ?? []
        for (const loc of locs) {
          try {
            const passes = await evaluateCondition(
              supabase,
              condition as Parameters<typeof evaluateCondition>[1],
              client.id,
              loc.id
            )
            if (!passes) continue

            const hasOpen = await getOpenOpportunitiesForClient(supabase, client.id, loc.id, trigger.id)
            if (hasOpen) {
              opportunitiesSkipped++
              continue
            }

            await createUpsellOpportunity(supabase, trigger.agency_id, client.id, loc.id, trigger.id)
            opportunitiesCreated++
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            errors.push(`trigger ${trigger.id} client ${client.id} loc ${loc.id}: ${msg}`)
          }
        }
      } else if (isClientMetric(metric)) {
        try {
          const passes = await evaluateCondition(
            supabase,
            condition as Parameters<typeof evaluateCondition>[1],
            client.id,
            null
          )
          if (!passes) continue

          const hasOpen = await getOpenOpportunitiesForClient(supabase, client.id, null, trigger.id)
          if (hasOpen) {
            opportunitiesSkipped++
            continue
          }

          await createUpsellOpportunity(supabase, trigger.agency_id, client.id, null, trigger.id)
          opportunitiesCreated++
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          errors.push(`trigger ${trigger.id} client ${client.id}: ${msg}`)
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    opportunities_created: opportunitiesCreated,
    opportunities_skipped: opportunitiesSkipped,
    errors,
  }
}
