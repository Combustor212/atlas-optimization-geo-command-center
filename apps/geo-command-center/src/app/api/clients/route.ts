import { NextResponse } from 'next/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getClients } from '@/lib/data/clients'

export async function GET() {
  try {
    const userAgency = await getCurrentUserAgency()
    if (!userAgency?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clients = await getClients(userAgency.agencyId)

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Error in GET /api/clients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
