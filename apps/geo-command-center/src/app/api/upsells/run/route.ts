import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateCondition, isLocationMetric, isClientMetric } from '@/lib/upsells/evaluator'
import { getOpenOpportunitiesForClient, createUpsellOpportunity } from '@/lib/data/upsells'
import type { UpsellTrigger } from '@/lib/upsells/types'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id || !['admin', 'staff'].includes(profile.role ?? '')) {
      return NextResponse.json(
        { error: 'Admin or staff access required' },
        { status: 403 }
      )
    }

    const agencyId = profile.agency_id

    const { data: triggers } = await supabase
      .from('upsell_triggers')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('is_active', true)

    if (!triggers || triggers.length === 0) {
      return NextResponse.json({
        created: 0,
        message: 'No active triggers to evaluate',
      })
    }

    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('agency_id', agencyId)

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        created: 0,
        message: 'No clients to evaluate',
      })
    }

    const { data: locationsByClient } = await supabase
      .from('locations')
      .select('id, client_id')
      .in('client_id', clients.map((c) => c.id))

    const clientLocations = new Map<string, { id: string }[]>()
    for (const loc of locationsByClient || []) {
      const list = clientLocations.get(loc.client_id) ?? []
      list.push({ id: loc.id })
      clientLocations.set(loc.client_id, list)
    }

    let created = 0

    for (const trigger of triggers as (UpsellTrigger & { condition: Record<string, unknown> })[]) {
      const condition = trigger.condition as { metric: string; op: string; value: unknown; windowDays?: number }
      const metric = condition?.metric
      if (!metric) continue

      for (const client of clients) {
        if (isLocationMetric(metric)) {
          const locs = clientLocations.get(client.id) ?? []
          for (const loc of locs) {
            const passes = await evaluateCondition(
              supabase,
              condition as Parameters<typeof evaluateCondition>[1],
              client.id,
              loc.id
            )
            if (!passes) continue

            const hasOpen = await getOpenOpportunitiesForClient(
              supabase,
              client.id,
              loc.id,
              trigger.id
            )
            if (hasOpen) continue

            await createUpsellOpportunity(
              supabase,
              agencyId,
              client.id,
              loc.id,
              trigger.id
            )
            created++
          }
        } else if (isClientMetric(metric)) {
          const passes = await evaluateCondition(
            supabase,
            condition as Parameters<typeof evaluateCondition>[1],
            client.id,
            null
          )
          if (!passes) continue

          const hasOpen = await getOpenOpportunitiesForClient(
            supabase,
            client.id,
            null,
            trigger.id
          )
          if (hasOpen) continue

          await createUpsellOpportunity(
            supabase,
            agencyId,
            client.id,
            null,
            trigger.id
          )
          created++
        }
      }
    }

    return NextResponse.json({
      created,
      message: `Created ${created} new upsell opportunity(ies)`,
    })
  } catch (error) {
    console.error('Error running upsell evaluation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
