import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_STATUSES = ['open', 'contacted', 'won', 'lost', 'dismissed'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, reason } = body

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Valid status required: open, contacted, won, lost, dismissed' },
        { status: 400 }
      )
    }

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

    const { data: existing } = await supabase
      .from('upsell_opportunities')
      .select('id, agency_id')
      .eq('id', id)
      .single()

    if (!existing || existing.agency_id !== profile.agency_id) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    const update: Record<string, unknown> = { status }
    if (reason !== undefined) update.reason = reason

    const { data, error } = await supabase
      .from('upsell_opportunities')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating opportunity:', error)
      return NextResponse.json(
        { error: 'Failed to update opportunity' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH upsell-opportunities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
