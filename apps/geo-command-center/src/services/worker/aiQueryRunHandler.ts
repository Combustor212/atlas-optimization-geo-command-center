/**
 * AI_QUERY_RUN worker handler.
 * Creates ai_query_runs row, calls provider (stub or real), parses response,
 * inserts ai_mentions.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { getLocationMatchInfoWithClient } from '@/lib/data/ai-mentions'
import { extractMentions, getSentimentWithOptionalOpenAI } from '@/lib/ai/mention-extraction'

export interface AiQueryRunPayload {
  ai_query_id: string
  agency_id: string
  location_id?: string
  platform?: string
  query_text?: string
}

/**
 * Stub AI provider: returns placeholder text for mention extraction.
 * Replace with real API call (OpenAI, Perplexity, etc.) when ready.
 */
async function callAiProviderStub(
  _queryText: string,
  locationName: string | null,
  _platform: string
): Promise<string> {
  const name = locationName ?? 'the business'
  return `According to the search results, ${name} appears in the local pack and is recommended by users. The business has positive visibility in AI-generated responses.`
}

/**
 * Execute a single AI_QUERY_RUN job.
 * Creates ai_query_runs row, calls provider (stub OK), parses, inserts ai_mentions.
 */
export async function handleAiQueryRun(
  payload: AiQueryRunPayload
): Promise<{ ok: boolean; runId?: string; error?: string }> {
  const supabase = createServiceClient()
  const locationId = payload.location_id
  const platform = payload.platform ?? 'chatgpt'
  const queryText = payload.query_text ?? ''

  if (!locationId) {
    return { ok: false, error: 'location_id required for AI_QUERY_RUN' }
  }

  const { data: run, error: runError } = await supabase
    .from('ai_query_runs')
    .insert({
      agency_id: payload.agency_id,
      ai_query_id: payload.ai_query_id,
      status: 'queued',
      ran_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (runError || !run) {
    return { ok: false, error: runError?.message ?? 'Failed to create ai_query_run' }
  }

  try {
    const locationInfo = await getLocationMatchInfoWithClient(supabase, locationId)
    if (!locationInfo) {
      await supabase
        .from('ai_query_runs')
        .update({ status: 'failed', notes: 'Location not found' })
        .eq('id', run.id)
      return { ok: false, error: 'Location not found' }
    }

    const rawText = await callAiProviderStub(queryText, locationInfo.locationName, platform)
    const extracted = extractMentions(rawText, locationInfo)
    const sentiment = await getSentimentWithOptionalOpenAI(rawText, extracted.sentiment)

    const { error: insertErr } = await supabase.from('ai_mentions').insert({
      agency_id: payload.agency_id,
      location_id: locationId,
      platform,
      mention_count: extracted.mention_count,
      visibility_score: extracted.visibility_score,
      sentiment,
      evidence: extracted.evidence as Record<string, unknown>,
    })

    if (insertErr) {
      await supabase
        .from('ai_query_runs')
        .update({ status: 'failed', notes: insertErr.message })
        .eq('id', run.id)
      return { ok: false, error: insertErr.message }
    }

    await supabase
      .from('ai_query_runs')
      .update({
        status: 'completed',
        raw_text: rawText,
        extracted: {
          mention_count: extracted.mention_count,
          visibility_score: extracted.visibility_score,
          sentiment,
          evidence: extracted.evidence,
        },
      })
      .eq('id', run.id)

    return { ok: true, runId: run.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await supabase
      .from('ai_query_runs')
      .update({ status: 'failed', notes: msg })
      .eq('id', run.id)
    return { ok: false, error: msg }
  }
}
