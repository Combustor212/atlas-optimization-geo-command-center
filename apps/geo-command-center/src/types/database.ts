export type UserRole = 'admin' | 'staff' | 'client'

export interface Agency {
  id: string
  name: string
  slug: string
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export type BaselineMethod = 'AVG_PRE_3' | 'AVG_PRE_6' | 'SINGLE_PRE_1' | 'MANUAL'
export type RevenueSource = 'MANUAL' | 'QB' | 'STRIPE' | 'SQUARE' | 'SHOPIFY' | 'OTHER'

export interface Client {
  id: string
  agency_id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
  stripe_customer_id: string | null
  service_start_date: string | null
  currency: string
  baseline_method: BaselineMethod
  baseline_revenue_manual: number | null
  gross_margin_pct: number
  attribution_pct: number
  exclude_partial_first_month: boolean
  count_only_positive_lift: boolean
  treat_missing_month_as_zero: boolean
  created_at: string
  updated_at: string
}

export interface ClientRevenueMonthly {
  id: string
  agency_id: string
  client_id: string
  month: string
  revenue: number
  source: RevenueSource
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RevenueImpactSummary {
  baseline_monthly_revenue: number
  current_month_revenue: number
  total_incremental_revenue: number
  attributed_incremental_revenue: number
  incremental_profit: number
  revenue_growth_pct: number
  avg_monthly_lift: number
  trailing3_after_avg: number
  trailing3_lift: number
  months_included: number
  months: RevenueMonthBreakdown[]
}

export interface RevenueMonthBreakdown {
  month: string
  revenue: number
  baseline: number
  delta: number
  delta_pct: number
  attributed_delta: number
  profit_delta: number
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

export type HealthBand = 'healthy' | 'watch' | 'risk'

export interface HealthScoreFactor {
  value: number
  normalized: number
  weight: number
  contribution: number
  label: string
}

export interface HealthScore {
  id: string
  agency_id: string
  client_id: string
  location_id: string | null
  score: number
  band: HealthBand
  factors: Record<string, HealthScoreFactor>
  calculated_at: string
}

export interface HealthScoreRule {
  id: string
  agency_id: string
  name: string
  weight: number
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AIPlatform = 'chatgpt' | 'gemini' | 'perplexity' | 'claude' | 'other'
export type AIQueryType = 'business_search' | 'recommendation' | 'comparison' | 'informational'
export type MentionContext = 'primary_recommendation' | 'list' | 'comparison' | 'passing_mention'
export type Sentiment = 'positive' | 'neutral' | 'negative'

export interface GenerativeAIVisibility {
  id: string
  location_id: string
  platform: AIPlatform
  query_type: AIQueryType
  search_query: string
  is_mentioned: boolean
  mention_position: number | null
  mention_context: MentionContext | null
  sentiment: Sentiment
  snippet: string | null
  competitors_mentioned: string[] | null
  unique_details_count: number
  visibility_score: number
  relevance_score: number
  prominence_score: number
  recorded_at: string
  source: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type SearchType = 'local_pack' | 'organic' | 'featured_snippet' | 'people_also_ask' | 'knowledge_panel'
export type DeviceType = 'desktop' | 'mobile' | 'tablet'
export type SearchIntent = 'navigational' | 'informational' | 'transactional' | 'commercial'
export type RichSnippetType = 'reviews' | 'faq' | 'how_to' | 'product' | 'recipe' | 'event' | 'other'

export interface SearchVisibility {
  id: string
  location_id: string
  keyword: string
  search_type: SearchType
  device_type: DeviceType
  position: number | null
  is_visible: boolean
  page_number: number
  has_featured_snippet: boolean
  has_knowledge_panel: boolean
  has_local_pack: boolean
  local_pack_position: number | null
  has_image_pack: boolean
  has_video_result: boolean
  gmb_shown: boolean
  gmb_photos_count: number
  gmb_reviews_shown: number
  gmb_posts_shown: number
  serp_features: string[] | null
  rich_snippet_type: RichSnippetType | null
  schema_markup_detected: boolean
  total_competitors_shown: number
  competitors_above: number
  market_share_pct: number
  overall_visibility_score: number
  serp_dominance_score: number
  search_intent: SearchIntent | null
  intent_match_score: number
  search_location: string | null
  distance_from_business: number | null
  recorded_at: string
  source: string
  screenshot_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface VisibilityGrowthMetrics {
  location_id: string
  location_name: string
  ai_visibility_score: number
  ai_mention_count: number
  ai_trend: 'growth' | 'stable' | 'decline'
  search_visibility_score: number
  serp_feature_coverage: number
  search_trend: 'growth' | 'stable' | 'decline'
  combined_visibility_score: number
  last_updated: string
}

// Citation & NAP Consistency
export interface NapProfile {
  id: string
  agency_id: string
  location_id: string
  canonical_name: string
  canonical_address: string
  canonical_phone: string
  canonical_website: string | null
  updated_at: string
}

export type CitationStatus = 'present' | 'missing' | 'duplicate' | 'incorrect'

export interface NapSnapshot {
  name?: string
  address?: string
  phone?: string
  website?: string
}

export interface Citation {
  id: string
  agency_id: string
  client_id: string
  location_id: string
  directory_name: string
  url: string | null
  status: CitationStatus
  nap_snapshot: NapSnapshot
  last_checked_at: string | null
}

export type CitationIssueType =
  | 'mismatched_name'
  | 'mismatched_address'
  | 'mismatched_phone'
  | 'mismatched_website'
  | 'duplicate'
  | 'missing'

export interface CitationIssue {
  type: CitationIssueType
  directory_name?: string
  message: string
  expected?: string
  actual?: string
}

export interface CitationAudit {
  id: string
  agency_id: string
  location_id: string
  consistency_score: number
  issues: CitationIssue[]
  created_at: string
}

// Competitor Intelligence Types
export interface Competitor {
  id: string
  agency_id: string
  client_id: string
  location_id: string
  name: string
  google_place_id: string | null
  website: string | null
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CompetitorRankSnapshot {
  id: string
  agency_id: string
  competitor_id: string
  location_id: string
  keyword: string
  grid_point: { lat: number; lng: number } | null
  rank_position: number
  captured_at: string
  source: 'manual' | 'google_api' | 'local_falcon'
  notes: string | null
  created_at: string
}

export interface CompetitorReviewSnapshot {
  id: string
  agency_id: string
  competitor_id: string
  rating: number | null
  review_count: number
  captured_at: string
  notes: string | null
  created_at: string
}

export interface CompetitorWithSnapshots {
  competitor: Competitor
  latest_rank: CompetitorRankSnapshot | null
  latest_review: CompetitorReviewSnapshot | null
  review_velocity: number // reviews per day
  rank_trend: 'up' | 'down' | 'stable'
  rank_history: CompetitorRankSnapshot[]
  review_history: CompetitorReviewSnapshot[]
}

// Review velocity forecasting
export interface ReviewForecast {
  id: string
  agency_id: string
  client_id: string
  location_id: string
  competitor_id: string | null
  forecast_window_days: number
  model_version: string
  current_review_count: number
  current_velocity_per_day: number
  projected_review_count: number
  goal_review_count: number | null
  estimated_date_to_goal: string | null
  created_at: string
}

// Recommendation Action Engine
export type RecommendationType =
  | 'reviews'
  | 'gmb'
  | 'content'
  | 'citations'
  | 'technical'
  | 'ai_visibility'
  | 'search_visibility'
export type RecommendationSeverity = 'low' | 'medium' | 'high'
export type RecommendationStatus = 'open' | 'in_progress' | 'done' | 'dismissed'

export interface Recommendation {
  id: string
  agency_id: string
  client_id: string
  location_id: string
  type: RecommendationType
  severity: RecommendationSeverity
  title: string
  description: string
  expected_impact: Record<string, unknown>
  status: RecommendationStatus
  created_by: 'system' | 'staff'
  created_at: string
  updated_at: string
}

// Auto-Scheduled White-Label Reports
export interface ReportTemplate {
  id: string
  agency_id: string
  name: string
  branding: { logo_url?: string; company_name?: string; accent_color?: string }
  sections: string[]
  created_at: string
}

export interface ReportSchedule {
  id: string
  agency_id: string
  client_id: string
  template_id: string
  frequency: 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  time_of_day: string
  timezone: string
  recipients: { email: string }[]
  is_active: boolean
  created_at: string
}

export type ReportRunStatus = 'queued' | 'generated' | 'sent' | 'failed'

export interface ReportRun {
  id: string
  agency_id: string
  client_id: string
  template_id: string
  status: ReportRunStatus
  pdf_path: string | null
  summary: Record<string, unknown>
  run_at: string
  created_at: string
}

// Tasks & Workflow
export type TaskType = 'citations' | 'gmb' | 'reviews' | 'content' | 'technical' | 'ai_visibility' | 'other'
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  agency_id: string
  client_id: string
  location_id: string | null
  title: string
  description: string | null
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  assigned_to_user_id: string | null
  created_by_user_id: string
  is_client_visible: boolean
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  agency_id: string
  task_id: string
  user_id: string
  comment: string
  created_at: string
}

export interface TaskActivity {
  id: string
  agency_id: string
  task_id: string
  event_type: string
  metadata: Record<string, unknown>
  created_at: string
}

// AI Mention Tracking (manual assisted capture)
export type AIQueryPlatform = 'chatgpt' | 'gemini' | 'perplexity' | 'claude'
export type AIQueryFrequency = 'weekly' | 'monthly'

export interface AIQueryRow {
  id: string
  agency_id: string
  location_id: string
  query_text: string
  platform: AIQueryPlatform
  frequency: AIQueryFrequency
  is_active: boolean
  created_at: string
}

export type AIQueryRunStatus = 'queued' | 'completed' | 'failed'

export interface AIQueryRunRow {
  id: string
  agency_id: string
  ai_query_id: string
  status: AIQueryRunStatus
  ran_at: string
  raw_text: string | null
  extracted: Record<string, unknown>
  notes: string | null
  created_at: string
}

export interface AIMentionRow {
  id: string
  agency_id: string
  location_id: string
  platform: string
  mention_count: number
  visibility_score: number
  sentiment: 'positive' | 'neutral' | 'negative' | null
  captured_at: string
  evidence: Record<string, unknown>
  created_at: string
}
