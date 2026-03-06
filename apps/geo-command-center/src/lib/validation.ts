import { z } from 'zod'

/**
 * Shared Zod validation schemas for the application
 */

// Common field validations
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const emailSchema = z.string().email('Invalid email address')
export const urlSchema = z.string().url('Invalid URL format').optional()

// Visibility tracking schemas
export const aiVisibilitySchema = z.object({
  location_id: uuidSchema,
  platform: z.enum(['chatgpt', 'gemini', 'perplexity', 'claude', 'other']),
  query_type: z.enum(['business_search', 'recommendation', 'comparison', 'informational']),
  search_query: z.string().min(1, 'Search query is required').max(500),
  is_mentioned: z.boolean(),
  mention_position: z.number().int().positive().nullable().optional(),
  mention_context: z.enum(['primary_recommendation', 'list', 'comparison', 'passing_mention']).nullable().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).default('neutral'),
  snippet: z.string().max(2000).nullable().optional(),
  competitors_mentioned: z.array(z.string()).nullable().optional(),
  unique_details_count: z.number().int().nonnegative().default(0),
  visibility_score: z.number().min(0).max(100),
  relevance_score: z.number().min(0).max(100),
  prominence_score: z.number().min(0).max(100),
  source: z.enum(['manual', 'api', 'automated']).default('manual'),
  notes: z.string().max(1000).nullable().optional(),
})

export const searchVisibilitySchema = z.object({
  location_id: uuidSchema,
  keyword: z.string().min(1, 'Keyword is required').max(200),
  search_type: z.enum(['local_pack', 'organic', 'featured_snippet', 'people_also_ask', 'knowledge_panel']),
  device_type: z.enum(['desktop', 'mobile', 'tablet']).default('desktop'),
  position: z.number().int().positive().nullable().optional(),
  is_visible: z.boolean(),
  page_number: z.number().int().positive().default(1),
  has_featured_snippet: z.boolean().default(false),
  has_knowledge_panel: z.boolean().default(false),
  has_local_pack: z.boolean().default(false),
  local_pack_position: z.number().int().min(1).max(3).nullable().optional(),
  has_image_pack: z.boolean().default(false),
  has_video_result: z.boolean().default(false),
  gmb_shown: z.boolean().default(false),
  gmb_photos_count: z.number().int().nonnegative().default(0),
  gmb_reviews_shown: z.number().int().nonnegative().default(0),
  gmb_posts_shown: z.number().int().nonnegative().default(0),
  serp_features: z.array(z.string()).nullable().optional(),
  rich_snippet_type: z.string().nullable().optional(),
  schema_markup_detected: z.boolean().default(false),
  total_competitors_shown: z.number().int().nonnegative().default(0),
  competitors_above: z.number().int().nonnegative().default(0),
  market_share_pct: z.number().min(0).max(100).default(0),
  overall_visibility_score: z.number().min(0).max(100),
  serp_dominance_score: z.number().min(0).max(100),
  search_intent: z.enum(['navigational', 'informational', 'transactional', 'commercial']).nullable().optional(),
  intent_match_score: z.number().min(0).max(100).default(0),
  search_location: z.string().max(200).nullable().optional(),
  distance_from_business: z.number().nonnegative().nullable().optional(),
  source: z.enum(['manual', 'api', 'serpapi', 'brightlocal', 'semrush']).default('manual'),
  screenshot_url: urlSchema,
  notes: z.string().max(1000).nullable().optional(),
})

// Helper to validate and parse request body
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: errors }
    }
    
    return { success: true, data: result.data }
  } catch {
    return { success: false, error: 'Invalid JSON body' }
  }
}

// Export types inferred from schemas
export type AIVisibilityInput = z.infer<typeof aiVisibilitySchema>
export type SearchVisibilityInput = z.infer<typeof searchVisibilitySchema>

// Competitor Intelligence Schemas
export const competitorSchema = z.object({
  location_id: uuidSchema,
  name: z.string().min(1, 'Competitor name is required').max(200),
  google_place_id: z.string().max(200).nullable().optional(),
  website: urlSchema,
  is_primary: z.boolean().default(false),
  notes: z.string().max(1000).nullable().optional(),
})

export const rankSnapshotSchema = z.object({
  competitor_id: uuidSchema,
  location_id: uuidSchema,
  keyword: z.string().min(1, 'Keyword is required').max(200),
  grid_point: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).nullable().optional(),
  rank_position: z.number().int().positive('Rank must be a positive number'),
  source: z.enum(['manual', 'google_api', 'local_falcon']).default('manual'),
  notes: z.string().max(1000).nullable().optional(),
})

export const reviewSnapshotSchema = z.object({
  competitor_id: uuidSchema,
  rating: z.number().min(0).max(5).nullable().optional(),
  review_count: z.number().int().nonnegative('Review count must be non-negative'),
  notes: z.string().max(1000).nullable().optional(),
})

// Combined snapshot schema (for adding both at once)
export const competitorSnapshotSchema = z.object({
  competitor_id: uuidSchema,
  location_id: uuidSchema,
  rank: rankSnapshotSchema.omit({ competitor_id: true, location_id: true }).optional(),
  review: reviewSnapshotSchema.omit({ competitor_id: true }).optional(),
})

export type CompetitorInput = z.infer<typeof competitorSchema>
export type RankSnapshotInput = z.infer<typeof rankSnapshotSchema>
export type ReviewSnapshotInput = z.infer<typeof reviewSnapshotSchema>
export type CompetitorSnapshotInput = z.infer<typeof competitorSnapshotSchema>

// Recommendations schemas
export const recommendationTypeSchema = z.enum([
  'reviews', 'gmb', 'content', 'citations', 'technical', 'ai_visibility', 'search_visibility'
])
export const recommendationSeveritySchema = z.enum(['low', 'medium', 'high'])
export const recommendationStatusSchema = z.enum(['open', 'in_progress', 'done', 'dismissed'])

export const patchRecommendationSchema = z.object({
  status: recommendationStatusSchema,
})

export type PatchRecommendationInput = z.infer<typeof patchRecommendationSchema>

// Lead attribution schemas
export const leadEventTypeSchema = z.enum(['call', 'form', 'booking', 'direction', 'website_click'])
export const createLeadEventSchema = z.object({
  event_type: leadEventTypeSchema,
  value: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  occurred_at: z.string().optional(),
})
export type CreateLeadEventInput = z.infer<typeof createLeadEventSchema>

// Tasks & Workflow
export const taskTypeSchema = z.enum(['citations','gmb','reviews','content','technical','ai_visibility','other'])
export const taskStatusSchema = z.enum(['todo','doing','blocked','done'])
export const taskPrioritySchema = z.enum(['low','medium','high'])

export const createTaskSchema = z.object({
  client_id: uuidSchema,
  location_id: uuidSchema.nullable().optional(),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).nullable().optional(),
  type: taskTypeSchema,
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('medium'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  assigned_to_user_id: uuidSchema.nullable().optional(),
  is_client_visible: z.boolean().default(false),
})
export type CreateTaskInput = z.infer<typeof createTaskSchema>

export const patchTaskSchema = z.object({
  location_id: uuidSchema.nullable().optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: taskTypeSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  assigned_to_user_id: uuidSchema.nullable().optional(),
  is_client_visible: z.boolean().optional(),
})
export type PatchTaskInput = z.infer<typeof patchTaskSchema>

export const createTaskCommentSchema = z.object({
  comment: z.string().min(1, 'Comment is required').max(5000),
})
export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>
