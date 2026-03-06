import { createClient } from '@/lib/supabase/server'
import { requireRole, getAgencyScope } from '@/lib/auth/scope'
import { rankSnapshotSchema, reviewSnapshotSchema } from '@/lib/validation'
import { errors, createdResponse } from '@/lib/api/errors'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ competitorId: string }> }
) {
  try {
    const { competitorId } = await params
    
    // 1. Require admin or staff role
    await requireRole(['admin', 'staff'])
    
    // 2. Get agency scope
    const scope = await getAgencyScope()
    if (!scope || !scope.agency_id) {
      return errors.forbidden('No agency access')
    }

    const supabase = await createClient()

    // 3. Verify competitor belongs to user's agency
    const { data: competitor } = await supabase
      .from('competitors')
      .select('agency_id, location_id')
      .eq('id', competitorId)
      .single()

    if (!competitor) {
      return errors.notFound('Competitor')
    }

    if (competitor.agency_id !== scope.agency_id) {
      return errors.agencyMismatch()
    }

    // 4. Parse request body - can contain rank, review, or both
    const body = (await request.json()) as { rank?: unknown; review?: unknown }
    
    const results: Record<string, unknown> = {}

    // 5. Create rank snapshot if provided
    if (body.rank) {
      const rankValidation = rankSnapshotSchema.safeParse({
        ...body.rank,
        competitor_id: competitorId,
        location_id: competitor.location_id,
      })

      if (!rankValidation.success) {
        return errors.validationError(`Rank: ${rankValidation.error.errors[0].message}`)
      }

      const { data: rankSnapshot, error: rankError } = await supabase
        .from('competitor_rank_snapshots')
        .insert([{
          ...rankValidation.data,
          agency_id: scope.agency_id,
        }])
        .select()
        .single()

      if (rankError) {
        console.error('Error creating rank snapshot:', rankError)
        return errors.internalError('Failed to create rank snapshot')
      }

      results.rank = rankSnapshot
    }

    // 6. Create review snapshot if provided
    if (body.review) {
      const reviewValidation = reviewSnapshotSchema.safeParse({
        ...body.review,
        competitor_id: competitorId,
      })

      if (!reviewValidation.success) {
        return errors.validationError(`Review: ${reviewValidation.error.errors[0].message}`)
      }

      const { data: reviewSnapshot, error: reviewError } = await supabase
        .from('competitor_review_snapshots')
        .insert([{
          ...reviewValidation.data,
          agency_id: scope.agency_id,
        }])
        .select()
        .single()

      if (reviewError) {
        console.error('Error creating review snapshot:', reviewError)
        return errors.internalError('Failed to create review snapshot')
      }

      results.review = reviewSnapshot
    }

    // 7. Return created snapshots
    return createdResponse(results)
    
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
