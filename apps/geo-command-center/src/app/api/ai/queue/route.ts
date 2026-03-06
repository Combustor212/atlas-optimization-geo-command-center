import { getCurrentUserAgency } from '@/lib/data/profile'
import { errors, successResponse } from '@/lib/api/errors'
import { getQueuedAIRuns } from '@/lib/data/ai-mentions'

export async function GET() {
  const { agencyId, role } = (await getCurrentUserAgency()) || {}
  if (!agencyId) return errors.unauthorized()
  if (role !== 'admin' && role !== 'staff') return errors.forbidden('Staff only')

  const runs = await getQueuedAIRuns(agencyId)
  return successResponse({ runs })
}
