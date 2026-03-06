/**
 * Google Search Console API Integration
 * 
 * This module handles fetching organic search data from Google Search Console.
 * 
 * Setup Instructions:
 * 1. Go to Google Cloud Console: https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Search Console API
 * 4. Create OAuth 2.0 credentials (Web application)
 * 5. Add authorized redirect URI: {YOUR_DOMAIN}/api/integrations/gsc/callback
 * 6. Add these to .env.local:
 *    - GSC_CLIENT_ID=your_client_id
 *    - GSC_CLIENT_SECRET=your_client_secret
 *    - GSC_REDIRECT_URI=your_redirect_uri
 * 
 * Features:
 * - Fetch clicks, impressions, CTR by URL
 * - Date range filtering
 * - Automatic token refresh
 */

import { google } from 'googleapis'

const searchconsole = google.searchconsole('v1')

export interface GSCConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  accessToken?: string
  refreshToken?: string
}

export interface GSCMetrics {
  url: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  date: string
}

/**
 * Initialize OAuth2 client
 */
export function getGSCClient(config: GSCConfig) {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  )

  if (config.accessToken) {
    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    })
  }

  return oauth2Client
}

/**
 * Get authorization URL for user to grant access
 */
export function getGSCAuthUrl(config: GSCConfig, state?: string): string {
  const oauth2Client = getGSCClient(config)
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
    prompt: 'consent',
    state,
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function getGSCTokens(config: GSCConfig, code: string) {
  const oauth2Client = getGSCClient(config)
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Fetch search analytics data from GSC
 */
export async function fetchGSCData(
  config: GSCConfig,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCMetrics[]> {
  const oauth2Client = getGSCClient(config)
  google.options({ auth: oauth2Client })

  try {
    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page', 'date'],
        rowLimit: 1000,
      },
    })

    const rows = response.data.rows || []
    return rows.map((row: { keys: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }) => ({
      url: row.keys[0],
      date: row.keys[1],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }))
  } catch (error) {
    console.error('GSC API Error:', error)
    throw new Error('Failed to fetch GSC data')
  }
}

/**
 * Example usage:
 * 
 * const config = {
 *   clientId: process.env.GSC_CLIENT_ID!,
 *   clientSecret: process.env.GSC_CLIENT_SECRET!,
 *   redirectUri: process.env.GSC_REDIRECT_URI!,
 *   accessToken: savedAccessToken,
 *   refreshToken: savedRefreshToken,
 * }
 * 
 * const data = await fetchGSCData(
 *   config,
 *   'https://example.com',
 *   '2024-01-01',
 *   '2024-01-31'
 * )
 */
