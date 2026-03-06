import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')

    let q = supabase
      .from('upsell_opportunities')
      .select(`
        *,
        upsell_triggers(id, name, offer_type, message_template),
        clients(id, name),
        locations(id, name)
      `)
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    if (status) q = q.eq('status', status)
    if (clientId) q = q.eq('client_id', clientId)

    const { data, error } = await q

    if (error) {
      console.error('Error fetching upsell opportunities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
        { status: 500 }
      )
    }

    const rows = (data || []).map((row: Record<string, unknown>) => {
      const trigger = Array.isArray(row.upsell_triggers)
        ? row.upsell_triggers[0]
        : row.upsell_triggers
      const client = Array.isArray(row.clients) ? row.clients[0] : row.clients
      const location = Array.isArray(row.locations) ? row.locations[0] : row.locations
      const rest = { ...row }
      delete rest.upsell_triggers
      delete rest.clients
      delete rest.locations
      return {
        ...rest,
        trigger,
        client_name: (client as { name?: string } | null)?.name ?? null,
        location_name: (location as { name?: string } | null)?.name ?? null,
      }
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error in GET upsell-opportunities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
