import { NextRequest, NextResponse } from 'next/server'
import { getAgencyScope } from '@/lib/auth/scope'
import { createClient } from '@/lib/supabase/server'

export interface Booking {
  id: string
  agency_id: string
  name: string
  email: string
  start_time: string
  end_time: string
  status: string
  google_meet_link: string | null
  created_at: string
}

/**
 * GET /api/bookings?month=YYYY-MM
 * Returns scheduled meetings for the current user's agency.
 * Optional: month (e.g. 2025-03) to filter by month; defaults to current month.
 */
export async function GET(req: NextRequest) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const monthParam = searchParams.get('month')

  const now = new Date()
  let startOfMonth: Date
  let endOfMonth: Date

  if (monthParam) {
    const [y, m] = monthParam.split('-').map(Number)
    if (!y || !m || m < 1 || m > 12) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 })
    }
    startOfMonth = new Date(y, m - 1, 1)
    endOfMonth = new Date(y, m, 0, 23, 59, 59, 999)
  } else {
    startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  const supabase = await createClient()
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, agency_id, name, email, start_time, end_time, status, google_meet_link, created_at')
    .eq('agency_id', scope.agency_id)
    .eq('status', 'scheduled')
    .gte('start_time', startOfMonth.toISOString())
    .lte('start_time', endOfMonth.toISOString())
    .order('start_time', { ascending: true })

  if (error) {
    console.error('GET /api/bookings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookings: (bookings ?? []) as Booking[] })
}
