/**
 * Google Analytics 4 API Integration
 * 
 * This module handles fetching traffic and conversion data from GA4.
 * 
 * Setup Instructions:
 * 1. Go to Google Cloud Console: https://console.cloud.google.com/
 * 2. Enable Google Analytics Data API
 * 3. Create OAuth 2.0 credentials or Service Account
 * 4. Add these to .env.local:
 *    - GA4_CLIENT_ID=your_client_id
 *    - GA4_CLIENT_SECRET=your_client_secret
 *    - GA4_REDIRECT_URI=your_redirect_uri
 *    OR for service account:
 *    - GA4_SERVICE_ACCOUNT_KEY=path_to_key.json
 * 
 * Features:
 * - Fetch sessions, users, conversions
 * - Custom event tracking
 * - Real-time data
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'

export interface GA4Config {
  propertyId: string
  credentials?: Record<string, unknown> // Service account credentials
}

export interface GA4Metrics {
  date: string
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
  avgSessionDuration: number
  conversions: number
}

/**
 * Initialize GA4 client
 */
export function getGA4Client(config: GA4Config) {
  return new BetaAnalyticsDataClient({
    credentials: config.credentials,
  })
}

/**
 * Fetch analytics data from GA4
 */
export async function fetchGA4Data(
  config: GA4Config,
  startDate: string,
  endDate: string
): Promise<GA4Metrics[]> {
  const client = getGA4Client(config)

  try {
    const [response] = await client.runReport({
      property: `properties/${config.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'conversions' },
      ],
    })

    const rows = response.rows || []
    return rows.map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      date: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value) || 0,
      users: parseInt(row.metricValues[1].value) || 0,
      pageviews: parseInt(row.metricValues[2].value) || 0,
      bounceRate: parseFloat(row.metricValues[3].value) || 0,
      avgSessionDuration: parseFloat(row.metricValues[4].value) || 0,
      conversions: parseInt(row.metricValues[5].value) || 0,
    }))
  } catch (error) {
    console.error('GA4 API Error:', error)
    throw new Error('Failed to fetch GA4 data')
  }
}

/**
 * Fetch real-time data
 */
export async function fetchGA4Realtime(config: GA4Config) {
  const client = getGA4Client(config)

  try {
    const [response] = await client.runRealtimeReport({
      property: `properties/${config.propertyId}`,
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
      ],
    })

    return {
      activeUsers: parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0'),
      pageviews: parseInt(response.rows?.[0]?.metricValues?.[1]?.value || '0'),
    }
  } catch (error) {
    console.error('GA4 Realtime API Error:', error)
    throw new Error('Failed to fetch GA4 realtime data')
  }
}

/**
 * Example usage:
 * 
 * const config = {
 *   propertyId: '123456789',
 *   credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY!),
 * }
 * 
 * const data = await fetchGA4Data(config, '2024-01-01', '2024-01-31')
 * const realtime = await fetchGA4Realtime(config)
 */
