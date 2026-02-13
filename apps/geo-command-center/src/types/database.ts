export type UserRole = 'admin' | 'staff' | 'client'

export interface Agency {
  id: string
  name: string
  slug: string
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  agency_id: string
  name: string
  email: string
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  client_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  business_type: string | null
  avg_repair_ticket: number
  avg_daily_jobs: number
  conversion_rate: number
  place_id: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  agency_id: string | null
  client_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  mrr: number
  interval: string
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  agency_id: string
  client_id: string | null
  stripe_payment_id: string | null
  amount: number
  type: 'subscription' | 'setup' | 'one_time'
  description: string | null
  paid_at: string
  created_at: string
}

export interface Ranking {
  id: string
  location_id: string
  keyword: string
  keyword_type: string
  map_pack_position: number | null
  organic_position: number | null
  recorded_at: string
  source: string
}

export interface TrafficMetric {
  id: string
  location_id: string
  organic_clicks: number
  impressions: number
  ctr: number
  recorded_at: string
  source: string
}

export interface RevenueEstimate {
  id: string
  location_id: string
  estimated_monthly_lift: number
  rank_improvement: number
  traffic_increase_pct: number
  ctr_lift: number
  calculated_at: string
}

export interface Review {
  id: string
  location_id: string
  count: number
  avg_rating: number
  recorded_at: string
  source: string
}

export interface CallTracked {
  id: string
  location_id: string
  call_count: number
  recorded_at: string
  source: string
}

export interface Profile {
  id: string
  agency_id: string | null
  client_id: string | null
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}
