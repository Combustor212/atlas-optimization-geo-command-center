import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import {
  getBusinessRankingForKeyword,
  geocodeAddress,
  type GooglePlacesConfig,
} from '@/lib/integrations/google-places'

/**
 * POST /api/geo/track-all-rankings
 * 
 * Track rankings for all locations in the agency for a specific keyword
 * 
 * Body:
 * {
 *   keyword: string
 *   clientId?: string (optional - track only this client's locations)
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
    const { keyword, clientId } = body

    if (!keyword) {
      return NextResponse.json(
        { error: 'keyword is required' },
        { status: 400 }
      )
    }

    // Get locations
    const supabase = await createClient()
    let query = supabase
      .from('locations')
      .select('id, name, address, city, state, zip, client_id, client:clients!inner(agency_id, name)')
      .eq('client.agency_id', agencyId)

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: locations, error: locError } = await query

    if (locError || !locations || locations.length === 0) {
      return NextResponse.json(
        { error: 'No locations found' },
        { status: 404 }
      )
    }

    const config: GooglePlacesConfig = { apiKey }
    const results = []
    const errors = []

    // Track each location
    for (const location of locations) {
      try {
        // Build address
        const fullAddress = [
          location.address,
          location.city,
          location.state,
          location.zip,
        ]
          .filter(Boolean)
          .join(', ')

        // Geocode
        const coordinates = await geocodeAddress(config, fullAddress)
        
        if (!coordinates) {
          errors.push({
            locationId: location.id,
            locationName: location.name,
            error: 'Could not geocode address',
          })
          continue
        }

        // Get ranking
        const ranking = await getBusinessRankingForKeyword(config, {
          businessName: location.name,
          keyword,
          location: coordinates,
          radius: 5000,
        })

        // Save to database
        const { error: insertError } = await supabase.from('rankings').insert({
          location_id: location.id,
          keyword,
          keyword_type: 'primary',
          map_pack_position: ranking.rank,
          organic_position: null,
          source: 'google_places_api',
        })

        if (insertError) {
          errors.push({
            locationId: location.id,
            locationName: location.name,
            error: 'Failed to save ranking',
          })
          continue
        }

        // Update place_id if found
        if (ranking.placeId && !(location as { place_id?: string }).place_id) {
          await supabase
            .from('locations')
            .update({ place_id: ranking.placeId })
            .eq('id', location.id)
        }

        results.push({
          locationId: location.id,
          locationName: location.name,
          rank: ranking.rank,
          placeId: ranking.placeId,
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error tracking ${location.name}:`, error)
        errors.push({
          locationId: location.id,
          locationName: location.name,
          error: 'API error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        keyword,
        tracked: results.length,
        total: locations.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error('Bulk track rankings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
