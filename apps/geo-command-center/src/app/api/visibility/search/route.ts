import { createClient } from '@/lib/supabase/server'
import { getAgencyScope, requireRole } from '@/lib/auth/scope'
import { validateBody, searchVisibilitySchema } from '@/lib/validation'
import { errors, createdResponse } from '@/lib/api/errors'

export async function POST(request: Request) {
  try {
    // 1. Require authentication and role
    await requireRole(['admin', 'staff'])
    
    // 2. Get agency scope
    const scope = await getAgencyScope()
    if (!scope || !scope.agency_id) {
      return errors.forbidden('No agency access')
    }

    // 3. Validate request body with Zod
    const validation = await validateBody(request, searchVisibilitySchema)
    if (!validation.success) {
      return errors.validationError(validation.error)
    }

    const data = validation.data
    const supabase = await createClient()

    // 4. Verify location belongs to user's agency (server-side check even with RLS)
    const { data: location } = await supabase
      .from('locations')
      .select('client_id, clients!inner(agency_id)')
      .eq('id', data.location_id)
      .single()

    if (!location) {
      return errors.notFound('Location')
    }

    // @ts-expect-error Supabase typing issue with nested select
    if (location.clients?.agency_id !== scope.agency_id) {
      return errors.agencyMismatch()
    }

    // 5. Insert the search visibility record
    const { data: inserted, error } = await supabase
      .from('search_visibility')
      .insert([data])
      .select()
      .single()

    if (error) {
      console.error('Error inserting search visibility:', error)
      return errors.internalError('Failed to create search visibility record')
    }

    // 6. Return created response
    return createdResponse(inserted)
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}

// Only POST is allowed
export async function GET() {
  return errors.methodNotAllowed(['POST'])
}

export async function PUT() {
  return errors.methodNotAllowed(['POST'])
}

export async function DELETE() {
  return errors.methodNotAllowed(['POST'])
}
