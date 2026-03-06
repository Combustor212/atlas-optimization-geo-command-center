import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getRevenueCollectedData } from '@/lib/data/agency'

export async function GET(request: NextRequest) {
  try {
    const { agencyId } = (await getCurrentUserAgency()) || {}
    if (!agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const data = await getRevenueCollectedData(agencyId, startDate, endDate)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching revenue data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    )
  }
}
