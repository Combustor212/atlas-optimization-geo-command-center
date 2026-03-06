import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { errors, successResponse, createdResponse } from '@/lib/api/errors'
import { getAIQueries } from '@/lib/data/ai-mentions'

const PLATFORMS = ['chatgpt', 'gemini', 'perplexity', 'claude'] as const
const FREQUENCIES = ['weekly', 'monthly'] as const

export async function GET(req: NextRequest) {
  const { agencyId, role } = (await getCurrentUserAgency()) || {}
  if (!agencyId) return errors.unauthorized()
  if (role !== 'admin' && role !== 'staff') return errors.forbidden('Staff only')

  const locationId = req.nextUrl.searchParams.get('location_id') ?? undefined
  const queries = await getAIQueries(agencyId, locationId)
  return successResponse({ queries })
}

export async function POST(req: NextRequest) {
  const { agencyId, role } = (await getCurrentUserAgency()) || {}
  if (!agencyId) return errors.unauthorized()
  if (role !== 'admin' && role !== 'staff') return errors.forbidden('Staff only')

  const body = await req.json().catch(() => ({}))
  const query_text = typeof body.query_text === 'string' ? body.query_text.trim() : ''
  const location_id = body.location_id
  const platform = body.platform
  const frequency = body.frequency

  if (!query_text) return errors.badRequest('query_text is required')
  if (!location_id) return errors.badRequest('location_id is required')
  if (!platform || !PLATFORMS.includes(platform)) return errors.badRequest('platform must be one of: ' + PLATFORMS.join(', '))
  if (!frequency || !FREQUENCIES.includes(frequency)) return errors.badRequest('frequency must be weekly or monthly')

  const supabase = await createClient()
  const { data: location } = await supabase
    .from('locations')
    .select('id, client_id, clients!inner(agency_id)')
    .eq('id', location_id)
    .single()

  const loc = location as { clients?: { agency_id: string } } | null
  if (!location || loc?.clients?.agency_id !== agencyId) return errors.forbidden('Location not in your agency')

  const { data: row, error } = await supabase
    .from('ai_queries')
    .insert({
      agency_id: agencyId,
      location_id,
      query_text,
      platform,
      frequency,
      is_active: true,
    })
    .select('id, agency_id, location_id, query_text, platform, frequency, is_active, created_at')
    .single()

  if (error) {
    console.error('ai_queries insert error:', error)
    return errors.internalError()
  }
  return createdResponse({ query: row })
}
