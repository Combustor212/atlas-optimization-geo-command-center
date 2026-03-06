import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import {
  getBusinessRankingForKeyword,
  geocodeAddress,
  type GooglePlacesConfig,
} from '@/lib/integrations/google-places'

/**
 * POST /api/geo/track-ranking
 * 
 * Automatically track ranking for a location using Google Places API
 * 
 * Body:
 * {
 *   locationId: string
 *   keyword: string
 * }
 */
export async function POST(request: Request) {
  try {
    const { agencyId } = (await getCurrentUserAgency()) || {}
    if (!agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { locationId, keyword } = body

    if (!locationId || !keyword) {
      return NextResponse.json(
        { error: 'locationId and keyword are required' },
        { status: 400 }
      )
    }

    // Get location details
    const supabase = await createClient()
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('*, client:clients!inner(agency_id, name)')
      .eq('id', locationId)
      .single()

    if (locError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Verify location belongs to user's agency
    if (location.client.agency_id !== agencyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Geocode the location address if we don't have coordinates
    const config: GooglePlacesConfig = { apiKey }
    
    // Build full address string
    const fullAddress = [
      location.address,
      location.city,
      location.state,
      location.zip,
    ]
      .filter(Boolean)
      .join(', ')
    
    // Try to geocode the address
    let coordinates = await geocodeAddress(config, fullAddress)
    
    // If geocoding fails, try just the ZIP code
    if (!coordinates && location.zip) {
      coordinates = await geocodeAddress(config, location.zip)
    }
    
    // If geocoding fails, try just city and state
    if (!coordinates && location.city && location.state) {
      coordinates = await geocodeAddress(config, `${location.city}, ${location.state}`)
    }
    
    if (!coordinates) {
      return NextResponse.json(
        { 
          error: 'Could not geocode address. The Geocoding API may not be enabled in your Google Cloud project. Please enable the "Geocoding API" in addition to the Places API.',
          debug: {
            address: location.address,
            city: location.city,
            state: location.state,
            zip: location.zip,
            fullAddress,
          },
          solution: 'Go to Google Cloud Console → APIs & Services → Library → Search "Geocoding API" → Enable'
        },
        { status: 400 }
      )
    }

    // Get ranking for the keyword
    const ranking = await getBusinessRankingForKeyword(config, {
      businessName: location.name,
      keyword,
      location: coordinates,
      radius: 5000, // 5km radius
    })

    // Save ranking to database
    const { error: insertError } = await supabase.from('rankings').insert({
      location_id: locationId,
      keyword,
      keyword_type: 'primary',
      map_pack_position: ranking.rank,
      organic_position: null,
      source: 'google_places_api',
    })

    if (insertError) {
      console.error('Failed to save ranking:', insertError)
      return NextResponse.json(
        { error: 'Failed to save ranking data' },
        { status: 500 }
      )
    }

    // Update location with place_id if found
    if (ranking.placeId && !location.place_id) {
      await supabase
        .from('locations')
        .update({ place_id: ranking.placeId })
        .eq('id', locationId)
    }

    return NextResponse.json({
      success: true,
      data: {
        keyword,
        rank: ranking.rank,
        placeId: ranking.placeId,
        totalResults: ranking.totalResults,
        location: {
          name: location.name,
          address: fullAddress,
        },
      },
    })
  } catch (error) {
    console.error('Track ranking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
