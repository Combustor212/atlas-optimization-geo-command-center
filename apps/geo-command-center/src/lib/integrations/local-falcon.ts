/**
 * Local Falcon Rank Tracking API Integration
 * 
 * This module handles automated rank tracking for local search.
 * Local Falcon provides accurate local pack rankings across geographic grids.
 * 
 * Setup Instructions:
 * 1. Sign up at https://localfalcon.com/
 * 2. Get your API key from dashboard
 * 3. Add to .env.local:
 *    - LOCAL_FALCON_API_KEY=your_api_key
 * 
 * API Documentation: https://localfalcon.com/api-docs
 * 
 * Features:
 * - Track local pack positions
 * - Grid-based ranking (city center, multiple points)
 * - Historical rank tracking
 * - Competitor analysis
 */

export interface LocalFalconConfig {
  apiKey: string
  baseUrl?: string
}

export interface RankingScan {
  scanId: string
  locationId: string
  keyword: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
}

export interface RankingResult {
  keyword: string
  averageRank: number
  bestRank: number
  worstRank: number
  gridPoints: Array<{
    lat: number
    lng: number
    rank: number | null
  }>
  competitorData?: Array<{
    name: string
    averageRank: number
  }>
  scannedAt: string
}

/**
 * Initialize Local Falcon client
 */
export function getLocalFalconClient(config: LocalFalconConfig) {
  const baseUrl = config.baseUrl || 'https://api.localfalcon.com/v1'
  
  return {
    baseUrl,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
  }
}

/**
 * Create a new ranking scan
 */
export async function createRankingScan(
  config: LocalFalconConfig,
  params: {
    businessName: string
    address: string
    keyword: string
    gridSize?: number // Default: 5x5 grid
  }
): Promise<RankingScan> {
  const client = getLocalFalconClient(config)
  
  try {
    const response = await fetch(`${client.baseUrl}/scans`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({
        business_name: params.businessName,
        address: params.address,
        keyword: params.keyword,
        grid_size: params.gridSize || 5,
      }),
    })

    if (!response.ok) {
      throw new Error(`Local Falcon API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      scanId: data.scan_id,
      locationId: data.location_id,
      keyword: params.keyword,
      status: data.status,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error('Local Falcon API Error:', error)
    throw new Error('Failed to create ranking scan')
  }
}

/**
 * Get scan results
 */
export async function getRankingResults(
  config: LocalFalconConfig,
  scanId: string
): Promise<RankingResult | null> {
  const client = getLocalFalconClient(config)
  
  try {
    const response = await fetch(`${client.baseUrl}/scans/${scanId}`, {
      headers: client.headers,
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Local Falcon API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.status !== 'completed') {
      return null // Still processing
    }

    return {
      keyword: data.keyword,
      averageRank: data.average_rank,
      bestRank: data.best_rank,
      worstRank: data.worst_rank,
      gridPoints: data.grid_points.map((point: { latitude: number; longitude: number; rank: number }) => ({
        lat: point.latitude,
        lng: point.longitude,
        rank: point.rank,
      })),
      competitorData: data.competitors?.map((comp: { name: string; average_rank: number }) => ({
        name: comp.name,
        averageRank: comp.average_rank,
      })),
      scannedAt: data.scanned_at,
    }
  } catch (error) {
    console.error('Local Falcon API Error:', error)
    throw new Error('Failed to fetch ranking results')
  }
}

/**
 * Get historical ranking data
 */
export async function getHistoricalRankings(
  config: LocalFalconConfig,
  locationId: string,
  keyword: string,
  days: number = 30
): Promise<Array<{ date: string; averageRank: number }>> {
  const client = getLocalFalconClient(config)
  
  try {
    const response = await fetch(
      `${client.baseUrl}/locations/${locationId}/history?keyword=${encodeURIComponent(keyword)}&days=${days}`,
      { headers: client.headers }
    )

    if (!response.ok) {
      throw new Error(`Local Falcon API error: ${response.status}`)
    }

    const data = await response.json()
    return data.history.map((entry: { date: string; average_rank: number }) => ({
      date: entry.date,
      averageRank: entry.average_rank,
    }))
  } catch (error) {
    console.error('Local Falcon API Error:', error)
    throw new Error('Failed to fetch historical rankings')
  }
}

/**
 * PLACEHOLDER MODE
 * When API key is not configured, use this to simulate data
 */
export async function getPlaceholderRankings(): Promise<RankingResult> {
  return {
    keyword: 'plumber near me',
    averageRank: 3.2,
    bestRank: 1,
    worstRank: 7,
    gridPoints: Array.from({ length: 25 }, () => ({
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1,
      rank: Math.floor(Math.random() * 10) + 1,
    })),
    scannedAt: new Date().toISOString(),
  }
}

/**
 * Example usage:
 * 
 * const config = {
 *   apiKey: process.env.LOCAL_FALCON_API_KEY!,
 * }
 * 
 * // Create a scan
 * const scan = await createRankingScan(config, {
 *   businessName: 'ABC Plumbing',
 *   address: '123 Main St, New York, NY',
 *   keyword: 'plumber near me',
 * })
 * 
 * // Wait for completion, then get results
 * const results = await getRankingResults(config, scan.scanId)
 * 
 * // Get historical data
 * const history = await getHistoricalRankings(config, scan.locationId, 'plumber near me')
 */
