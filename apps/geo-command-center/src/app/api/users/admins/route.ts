import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllUsers } from '@/lib/data/users'

export async function GET() {
  try {
    const supabase = await createClient()

    // Verify the requesting user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the user's profile and agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.agency_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Only admins and staff can view admin list
    if (!['admin', 'staff'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get all users for the agency
    const users = await getAllUsers(profile.agency_id)

    // Filter for admins only
    const admins = users.filter(u => u.role === 'admin')

    return NextResponse.json({
      admins,
      count: admins.length,
      agency_id: profile.agency_id
    })
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
