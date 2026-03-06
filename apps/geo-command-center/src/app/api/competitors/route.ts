import { createClient } from '@/lib/supabase/server'
import { requireRole, getAgencyScope } from '@/lib/auth/scope'
import { validateBody, competitorSchema } from '@/lib/validation'
import { errors, createdResponse } from '@/lib/api/errors'

export async function POST(request: Request) {
  try {
    // 1. Require admin or staff role
    await requireRole(['admin', 'staff'])
    
    // 2. Get agency scope
    const scope = await getAgencyScope()
    if (!scope || !scope.agency_id) {
      return errors.forbidden('No agency access')
    }

    // 3. Validate request body
    const validation = await validateBody(request, competitorSchema)
    if (!validation.success) {
      return errors.validationError(validation.error)
    }

    const data = validation.data
    const supabase = await createClient()

    // 4. Verify location belongs to user's agency
    const { data: location } = await supabase
      .from('locations')
      .select('client_id, clients!inner(agency_id)')
      .eq('id', data.location_id)
      .single()

    if (!location) {
      return errors.notFound('Location')
    }

    // @ts-expect-error Supabase nested select typing
    if (location.clients?.agency_id !== scope.agency_id) {
      return errors.agencyMismatch()
    }

    // 5. Insert competitor with agency scoping
    const { data: competitor, error } = await supabase
      .from('competitors')
      .insert([{
        ...data,
        agency_id: scope.agency_id,
        client_id: location.client_id,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating competitor:', error)
      return errors.internalError('Failed to create competitor')
    }

    // 6. Return created response
    return createdResponse(competitor)
    
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}

// Only POST allowed
export async function GET() {
  return errors.methodNotAllowed(['POST'])
}

export async function PUT() {
  return errors.methodNotAllowed(['POST'])
}

export async function DELETE() {
  return errors.methodNotAllowed(['POST'])
}
