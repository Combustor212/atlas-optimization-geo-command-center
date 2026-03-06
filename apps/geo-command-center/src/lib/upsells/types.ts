export type UpsellOfferType = 'ads' | 'cro' | 'content' | 'reputation' | 'ai_pr' | 'other'
export type UpsellOpportunityStatus = 'open' | 'contacted' | 'won' | 'lost' | 'dismissed'

export type UpsellConditionMetric =
  | 'avg_rank'
  | 'calls_monthly'
  | 'ai_visibility_score'
  | 'health_band'

export type UpsellConditionOp = '<=' | '>=' | '=' | '<' | '>'

export interface UpsellCondition {
  metric: UpsellConditionMetric
  op: UpsellConditionOp
  value: number | string
  windowDays?: number
}

export interface UpsellTrigger {
  id: string
  agency_id: string
  name: string
  condition: UpsellCondition
  offer_type: UpsellOfferType
  message_template: string
  is_active: boolean
  created_at: string
}

export interface UpsellOpportunity {
  id: string
  agency_id: string
  client_id: string
  location_id: string | null
  trigger_id: string
  status: UpsellOpportunityStatus
  reason: string | null
  created_at: string
  updated_at: string
}
