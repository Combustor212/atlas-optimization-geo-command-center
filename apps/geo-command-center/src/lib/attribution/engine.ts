/**
 * Lead Attribution Engine
 * Evaluates attribution rules against lead event metadata and creates attributions
 * with confidence from rule weights. Supports: equals, contains, regex, exists.
 */

import { z } from 'zod'

export const CHANNELS = ['maps', 'organic', 'ai', 'direct', 'paid', 'referral'] as const
export type AttributionChannel = (typeof CHANNELS)[number]

const matchCriteriaSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'contains', 'regex', 'exists']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
})
export type MatchCriterion = z.infer<typeof matchCriteriaSchema>

export const attributionRuleSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  name: z.string(),
  channel: z.enum(CHANNELS),
  match_criteria: z.union([
    z.array(matchCriteriaSchema),
    matchCriteriaSchema,
  ]),
  weight: z.number().min(0),
  is_active: z.boolean(),
})
export type AttributionRuleRow = z.infer<typeof attributionRuleSchema>

export interface LeadEventPayload {
  event_type: 'call' | 'form' | 'booking' | 'direction' | 'website_click'
  value?: number | null
  metadata?: Record<string, unknown>
  occurred_at?: string
}

/** Safely parse metadata as object (e.g. from JSONB or request body). */
export function safeMetadata(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {}
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // ignore
    }
  }
  return {}
}

/** Get nested value by path like "metadata.referrer" or "metadata.utm_medium". */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/^metadata\.?/, '').split('.')
  let current: unknown = obj
  for (const p of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[p]
  }
  return current
}

function criterionMatches(meta: Record<string, unknown>, criterion: MatchCriterion): boolean {
  const parsed = matchCriteriaSchema.safeParse(criterion)
  if (!parsed.success) return false
  const { field, operator, value } = parsed.data
  const raw = field.startsWith('metadata.') ? getByPath(meta, field) : getByPath(meta, `metadata.${field}`)
  const strVal = raw !== undefined && raw !== null ? String(raw) : ''

  switch (operator) {
    case 'exists':
      return raw !== undefined && raw !== null && strVal !== ''
    case 'equals':
      if (value === undefined) return false
      if (Array.isArray(value)) return value.some((v) => strVal === String(v))
      return strVal === String(value)
    case 'contains':
      if (value === undefined || typeof value !== 'string') return false
      return strVal.toLowerCase().includes(String(value).toLowerCase())
    case 'regex': {
      if (value === undefined || typeof value !== 'string') return false
      try {
        const re = new RegExp(String(value), 'i')
        return re.test(strVal)
      } catch {
        return false
      }
    }
    default:
      return false
  }
}

/** Normalize match_criteria to array of criteria (AND). */
function getCriteriaList(rule: { match_criteria: unknown }): MatchCriterion[] {
  const raw = rule.match_criteria
  if (Array.isArray(raw)) {
    return raw.filter((c): c is MatchCriterion => matchCriteriaSchema.safeParse(c).success)
  }
  const one = matchCriteriaSchema.safeParse(raw)
  return one.success ? [one.data] : []
}

/** Returns true if the rule matches the event metadata. */
export function ruleMatches(meta: Record<string, unknown>, rule: AttributionRuleRow): boolean {
  const criteria = getCriteriaList(rule)
  if (criteria.length === 0) return false
  return criteria.every((c) => criterionMatches(meta, c))
}

export interface AttributionResult {
  channel: AttributionChannel
  confidence: number
  attributed_value?: number | null
}

const CLOSE_CONFIDENCE_THRESHOLD = 0.2

/**
 * Evaluate active rules against event metadata; compute confidence from weights,
 * return primary and optional secondary (if confidence is close).
 */
export function evaluateAttributions(
  metadata: Record<string, unknown>,
  rules: AttributionRuleRow[],
  eventValue?: number | null
): AttributionResult[] {
  const active = rules.filter((r) => r.is_active)
  const matching = active.filter((r) => ruleMatches(metadata, r))
  if (matching.length === 0) {
    return [{ channel: 'direct', confidence: 1, attributed_value: eventValue ?? null }]
  }
  const totalWeight = matching.reduce((s, r) => s + Number(r.weight), 0)
  if (totalWeight <= 0) {
    return [{ channel: 'direct', confidence: 1, attributed_value: eventValue ?? null }]
  }
  const withConfidence = matching.map((r) => ({
    channel: r.channel as AttributionChannel,
    confidence: Number(r.weight) / totalWeight,
  }))
  withConfidence.sort((a, b) => b.confidence - a.confidence)
  const primary = withConfidence[0]
  const results: AttributionResult[] = [
    { channel: primary.channel, confidence: primary.confidence, attributed_value: eventValue ?? null },
  ]
  const secondary = withConfidence[1]
  if (secondary && primary.confidence - secondary.confidence <= CLOSE_CONFIDENCE_THRESHOLD) {
    results.push({
      channel: secondary.channel,
      confidence: secondary.confidence,
      attributed_value: null,
    })
  }
  return results
}

/** Default rules: paid (gclid), maps (referrer), organic (utm_medium), ai (source), else direct. */
export const DEFAULT_ATTRIBUTION_RULES: Omit<AttributionRuleRow, 'id' | 'agency_id'>[] = [
  { name: 'Paid (gclid)', channel: 'paid', match_criteria: [{ field: 'metadata.gclid', operator: 'exists' }], weight: 1, is_active: true },
  { name: 'Maps (google.com/maps)', channel: 'maps', match_criteria: [{ field: 'metadata.referrer', operator: 'contains', value: 'google.com/maps' }], weight: 1, is_active: true },
  { name: 'Maps (g.page)', channel: 'maps', match_criteria: [{ field: 'metadata.referrer', operator: 'contains', value: 'g.page' }], weight: 1, is_active: true },
  { name: 'Organic (utm)', channel: 'organic', match_criteria: [{ field: 'metadata.utm_medium', operator: 'equals', value: 'organic' }], weight: 1, is_active: true },
  { name: 'AI (source)', channel: 'ai', match_criteria: [{ field: 'metadata.source', operator: 'equals', value: ['chatgpt', 'gemini'] }], weight: 1, is_active: true },
]

/** Default rule order: paid > maps > organic > ai > direct. Direct has lowest weight so it only wins when nothing else matches. */
export const DEFAULT_RULE_ORDER: AttributionChannel[] = ['paid', 'maps', 'organic', 'ai', 'direct', 'referral']
