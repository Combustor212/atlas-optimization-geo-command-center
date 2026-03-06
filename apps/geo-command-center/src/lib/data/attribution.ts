import { createClient } from '@/lib/supabase/server'
import type { AttributionRuleRow } from '@/lib/attribution/engine'
import {
  DEFAULT_ATTRIBUTION_RULES,
  evaluateAttributions,
  safeMetadata,
  type AttributionResult,
} from '@/lib/attribution/engine'

const CHANNELS = ['maps', 'organic', 'ai', 'direct', 'paid', 'referral'] as const

export interface CreateLeadEventInput {
  location_id: string
  event_type: 'call' | 'form' | 'booking' | 'direction' | 'website_click'
  value?: number | null
  metadata?: Record<string, unknown> | null
  occurred_at?: string
}

export interface LeadEventRow {
  id: string
  agency_id: string
  client_id: string
  location_id: string
  event_type: string
  occurred_at: string
  value: number | null
  metadata: Record<string, unknown>
}

/** Resolve location to agency_id and client_id. */
export async function getLocationScope(locationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('id, client_id, clients!inner(agency_id)')
    .eq('id', locationId)
    .single()
  if (error || !data) return null
  const clients = data.clients as { agency_id: string } | { agency_id: string }[] | null
  const agency_id = clients ? (Array.isArray(clients) ? clients[0]?.agency_id : clients.agency_id) : undefined
  if (!agency_id) return null
  return { location_id: data.id, client_id: data.client_id, agency_id }
}

/** Get active attribution rules for agency; if none, use defaults (in-memory). */
export async function getAttributionRulesForAgency(agencyId: string): Promise<AttributionRuleRow[]> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('attribution_rules')
    .select('id, agency_id, name, channel, match_criteria, weight, is_active')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('weight', { ascending: false })
  if (rows && rows.length > 0) {
    return rows as unknown as AttributionRuleRow[]
  }
  return DEFAULT_ATTRIBUTION_RULES.map((r, i) => ({
    ...r,
    id: `default-${agencyId}-${i}`,
    agency_id: agencyId,
  })) as AttributionRuleRow[]
}

/** Create lead_event and run attribution; insert lead_attributions. Returns created event + attributions. */
export async function createLeadEventWithAttribution(
  input: CreateLeadEventInput
): Promise<{ event: LeadEventRow; attributions: AttributionResult[] } | null> {
  const scope = await getLocationScope(input.location_id)
  if (!scope) return null

  const supabase = await createClient()
  const metadata = safeMetadata(input.metadata ?? {})
  const occurredAt = input.occurred_at ?? new Date().toISOString()

  const { data: event, error: eventError } = await supabase
    .from('lead_events')
    .insert({
      agency_id: scope.agency_id,
      client_id: scope.client_id,
      location_id: scope.location_id,
      event_type: input.event_type,
      occurred_at: occurredAt,
      value: input.value ?? null,
      metadata: metadata as Record<string, unknown>,
    })
    .select('id, agency_id, client_id, location_id, event_type, occurred_at, value, metadata')
    .single()

  if (eventError || !event) return null

  const rules = await getAttributionRulesForAgency(scope.agency_id)
  const results = evaluateAttributions(metadata, rules, input.value ?? event.value)

  const attrs = results.map((a) => ({
    agency_id: scope.agency_id,
    lead_event_id: event.id,
    channel: a.channel,
    confidence: a.confidence,
    attributed_value: a.attributed_value ?? null,
  }))
  const { error: attrError } = await supabase.from('lead_attributions').insert(attrs)
  if (attrError) {
    console.error('Lead attributions insert failed:', attrError)
  }

  return {
    event: event as LeadEventRow,
    attributions: results,
  }
}

export interface AttributionSummaryBucket {
  channel: string
  count: number
  value: number
}

export interface AttributionTimePoint {
  date: string
  channel: string
  count: number
  value: number
}

export interface AttributionSummaryResult {
  byChannel: AttributionSummaryBucket[]
  timeSeries: AttributionTimePoint[]
  totalLeads: number
  totalValue: number
}

/** Parse range query: 30d, 7d, 90d -> days number. */
export function parseRangeToDays(range: string | null): number {
  if (!range || typeof range !== 'string') return 30
  const m = range.match(/^(\d+)d$/)
  return m ? Math.min(Math.max(1, parseInt(m[1], 10)), 365) : 30
}

/** Get attribution summary for a location: counts/value by channel + time series. */
export async function getAttributionSummary(
  locationId: string,
  rangeDays: number
): Promise<AttributionSummaryResult | null> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - rangeDays)
  const sinceStr = since.toISOString()

  const { data: events, error: eventsError } = await supabase
    .from('lead_events')
    .select('id, value, occurred_at')
    .eq('location_id', locationId)
    .gte('occurred_at', sinceStr)

  if (eventsError || !events) return null
  const eventIds = (events as { id: string }[]).map((e) => e.id)
  if (eventIds.length === 0) {
    return {
      byChannel: CHANNELS.map((c) => ({ channel: c, count: 0, value: 0 })),
      timeSeries: [],
      totalLeads: 0,
      totalValue: 0,
    }
  }

  const { data: attributions } = await supabase
    .from('lead_attributions')
    .select('lead_event_id, channel, confidence, attributed_value')
    .in('lead_event_id', eventIds)

  const eventMap = new Map(
    (events as { id: string; value: number | null; occurred_at: string }[]).map((e) => [
      e.id,
      { value: e.value ?? 0, occurred_at: e.occurred_at },
    ])
  )
  const attrs = (attributions || []) as {
    lead_event_id: string
    channel: string
    confidence: number
    attributed_value: number | null
  }[]
  // Primary attribution per event (highest confidence only) so each event counts once per channel
  const primaryByEvent = new Map<string, (typeof attrs)[0]>()
  for (const a of attrs) {
    const existing = primaryByEvent.get(a.lead_event_id)
    if (!existing || a.confidence > existing.confidence) primaryByEvent.set(a.lead_event_id, a)
  }
  const primaryAttrs = Array.from(primaryByEvent.values())

  const byChannel = new Map<string, { count: number; value: number }>()
  for (const c of CHANNELS) byChannel.set(c, { count: 0, value: 0 })
  const byDateChannel = new Map<string, { count: number; value: number }>()

  for (const a of primaryAttrs) {
    const ev = eventMap.get(a.lead_event_id)
    if (!ev) continue
    const val = a.attributed_value ?? ev.value
    const cur = byChannel.get(a.channel) ?? { count: 0, value: 0 }
    cur.count += 1
    cur.value += Number(val)
    byChannel.set(a.channel, cur)
    const dateKey = ev.occurred_at.slice(0, 10)
    const dcKey = `${dateKey}|${a.channel}`
    const dc = byDateChannel.get(dcKey) ?? { count: 0, value: 0 }
    dc.count += 1
    dc.value += Number(val)
    byDateChannel.set(dcKey, dc)
  }

  const byChannelList: AttributionSummaryBucket[] = CHANNELS.map((c) => {
    const x = byChannel.get(c) ?? { count: 0, value: 0 }
    return { channel: c, count: x.count, value: x.value }
  }).filter((x) => x.count > 0 || x.value > 0)

  const timeSeries: AttributionTimePoint[] = Array.from(byDateChannel.entries()).map(([key, v]) => {
    const [date, channel] = key.split('|')
    return { date, channel, count: v.count, value: v.value }
  })
  timeSeries.sort((a, b) => a.date.localeCompare(b.date))

  const totalLeads = events.length
  const totalValue = (events as { value: number | null }[]).reduce((s, e) => s + (e.value ?? 0), 0)

  return {
    byChannel: byChannelList.length ? byChannelList : CHANNELS.map((c) => ({ channel: c, count: 0, value: 0 })),
    timeSeries,
    totalLeads,
    totalValue,
  }
}
