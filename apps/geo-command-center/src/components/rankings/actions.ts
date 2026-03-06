'use server'

import { createClient } from '@/lib/supabase/server'

export async function addRanking(data: {
  locationId: string
  keyword: string
  keywordType: string
  mapPackPosition: number | null
  organicPosition: number | null
  source: string
}) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('rankings').insert({
    location_id: data.locationId,
    keyword: data.keyword,
    keyword_type: data.keywordType,
    map_pack_position: data.mapPackPosition,
    organic_position: data.organicPosition,
    source: data.source,
    recorded_at: new Date().toISOString(),
  })

  if (error) throw error
  return { success: true }
}

export async function addTrafficMetric(data: {
  locationId: string
  organicClicks: number
  impressions: number
  ctr: number
  date: string
  source: string
}) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('traffic_metrics').insert({
    location_id: data.locationId,
    organic_clicks: data.organicClicks,
    impressions: data.impressions,
    ctr: data.ctr,
    recorded_at: data.date,
    source: data.source,
  })

  if (error) throw error
  return { success: true }
}

export async function addCallTracking(data: {
  locationId: string
  callCount: number
  date: string
}) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('calls_tracked').insert({
    location_id: data.locationId,
    call_count: data.callCount,
    recorded_at: data.date,
    source: 'manual',
  })

  if (error) throw error
  return { success: true }
}

export async function addReview(data: {
  locationId: string
  count: number
  avgRating: number
  date: string
}) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('reviews').insert({
    location_id: data.locationId,
    count: data.count,
    avg_rating: data.avgRating,
    recorded_at: data.date,
    source: 'manual',
  })

  if (error) throw error
  return { success: true }
}
