import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ags-leads-api-key, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

/**
 * POST /api/leads - Accept lead submissions from AGS Contact Us and Book a Call forms.
 * Protected by AGS_LEADS_API_KEY header. No user auth required (form submitters are anonymous).
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-ags-leads-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
    const expectedKey = process.env.AGS_LEADS_API_KEY

    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
    }

    const body = await req.json()
    const source = body.source as string
    const email = (body.email as string)?.trim()
    // For scan leads, name comes from businessName; for contact/call, from name
    const name = (body.name as string)?.trim() || (body.business_name as string)?.trim() || (body.businessName as string)?.trim()

    if (!source || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: source, email' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // name is required; for scan use businessName, else require name
    const displayName = name || (body.business_name as string)?.trim() || (body.businessName as string)?.trim() || (source === 'scan' ? `Scan Lead (${email})` : null)
    if (!displayName) {
      return NextResponse.json(
        { error: 'Missing required field: name (or business_name/businessName for scan)' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (!['contact_form', 'scheduled_call', 'scan'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be contact_form, scheduled_call, or scan' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const agencySlug = process.env.AGS_LEADS_AGENCY_SLUG || 'my-agency'
    const supabase = getSupabaseAdmin()

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('slug', agencySlug)
      .single()

    if (!agency) {
      console.error('Leads API: Agency not found for slug:', agencySlug)
      return NextResponse.json(
        { error: 'Agency configuration error' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    const insert: Record<string, unknown> = {
      agency_id: agency.id,
      source,
      name: displayName,
      email,
      phone: (body.phone as string)?.trim() || null,
      business_name: (body.business_name as string)?.trim() || (body.businessName as string)?.trim() || (body.business as string)?.trim() || null,
      message: (body.message as string)?.trim() || null,
    }

    if (source === 'scan' && body.metadata) {
      insert.metadata = body.metadata
    }

    if (source === 'scheduled_call') {
      insert.preferred_time = (body.preferred_time as string) || (body.preferredTime as string) || null
      insert.preferred_date = (body.preferred_date as string) || (body.preferredDate as string) || null
      insert.timezone = (body.timezone as string) || null
      insert.scheduled_at = (body.scheduled_at as string) || null
      insert.meet_link = (body.meet_link as string) || null
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert(insert)
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Leads API insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save lead' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({ success: true, id: lead.id, created_at: lead.created_at }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('Leads API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
