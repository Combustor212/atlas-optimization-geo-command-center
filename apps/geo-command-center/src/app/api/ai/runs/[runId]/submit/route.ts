import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import { getAIQueryRun, getLocationMatchInfo } from '@/lib/data/ai-mentions'
import { extractMentions, getSentimentWithOptionalOpenAI } from '@/lib/ai/mention-extraction'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    const user = await getSessionUser()
    if (!user) return errors.unauthorized()
    if (user.role !== 'admin' && user.role !== 'staff') return errors.forbidden('Staff only')

    const agencyId = user.agency_id
    if (!agencyId) return errors.forbidden('No agency')

    const body = await req.json().catch(() => ({}))
    const raw_text = typeof body.raw_text === 'string' ? body.raw_text.trim() : ''
    if (!raw_text) return errors.badRequest('raw_text is required')

    const runInfo = await getAIQueryRun(runId, agencyId)
    if (!runInfo) return errors.notFound('Run')

    const { locationId, platform } = runInfo
    const locationInfo = await getLocationMatchInfo(locationId)
    if (!locationInfo) return errors.notFound('Location')

    const extracted = extractMentions(raw_text, locationInfo)
    const sentiment = await getSentimentWithOptionalOpenAI(raw_text, extracted.sentiment)

    const supabase = await createClient()

    const { error: insertErr } = await supabase.from('ai_mentions').insert({
      agency_id: agencyId,
      location_id: locationId,
      platform,
      mention_count: extracted.mention_count,
      visibility_score: extracted.visibility_score,
      sentiment,
      evidence: extracted.evidence as Record<string, unknown>,
    })

    if (insertErr) {
      console.error('ai_mentions insert error:', insertErr)
      return errors.internalError()
    }

    const { error: updateErr } = await supabase
      .from('ai_query_runs')
      .update({
        status: 'completed',
        raw_text,
        extracted: {
          mention_count: extracted.mention_count,
          visibility_score: extracted.visibility_score,
          sentiment,
          evidence: extracted.evidence,
        },
      })
      .eq('id', runId)
      .eq('agency_id', agencyId)

    if (updateErr) {
      console.error('ai_query_runs update error:', updateErr)
      return errors.internalError()
    }

    return successResponse({
      ok: true,
      mention_count: extracted.mention_count,
      visibility_score: extracted.visibility_score,
      sentiment,
    })
  } catch (e) {
    console.error('Submit AI run error:', e)
    return errors.internalError()
  }
}
