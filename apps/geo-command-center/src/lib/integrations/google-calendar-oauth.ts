/**
 * Google Calendar OAuth integration for Book a Call.
 * Admin connects Google once; backend uses refresh token to create events.
 *
 * Setup:
 * 1. Enable Google Calendar API in Google Cloud Console
 * 2. Create OAuth 2.0 credentials (Web application)
 * 3. Add redirect URI: {YOUR_DOMAIN}/api/integrations/google-calendar/callback
 * 4. Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET in env
 */

import { google } from 'googleapis'

export interface GoogleCalendarOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  accessToken?: string
  refreshToken?: string
}

export function getGoogleCalendarOAuthClient(config: GoogleCalendarOAuthConfig) {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  )

  if (config.accessToken || config.refreshToken) {
    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    })
  }

  return oauth2Client
}

/**
 * Get authorization URL for admin to connect Google Calendar.
 * Uses offline access to obtain refresh token.
 */
export function getGoogleCalendarAuthUrl(
  config: Omit<GoogleCalendarOAuthConfig, 'accessToken' | 'refreshToken'>,
  state?: string
): string {
  const oauth2Client = getGoogleCalendarOAuthClient(config)
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
    state,
  })
}

/**
 * Exchange authorization code for tokens.
 */
export async function getGoogleCalendarTokens(
  config: Omit<GoogleCalendarOAuthConfig, 'accessToken' | 'refreshToken'>,
  code: string
) {
  const oauth2Client = getGoogleCalendarOAuthClient(config)
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}
