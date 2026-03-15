'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Authorization was cancelled or parameters were missing.',
  invalid_state: 'Invalid state. Please try again.',
  not_configured: 'Google Calendar OAuth is not configured. Add GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET to .env.local',
  no_agency: 'Your account has no agency. Contact an admin.',
  no_refresh_token: 'Could not get refresh token. Please try again and grant all permissions.',
  save_failed: 'Failed to save connection.',
  redirect_mismatch: 'Redirect URI mismatch. Ensure https://admin.atlasgrowths.com/api/integrations/google-calendar/callback is in Google Cloud Console.',
  callback_failed: 'Connection failed. Please try again.',
}

export function GoogleCalendarCallbackBanner() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const connected = searchParams.get('google_calendar_connected')
  const error = searchParams.get('google_calendar_error')

  if (connected === '1') {
    return (
      <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Google Calendar connected successfully.
      </div>
    )
  }

  if (error) {
    const msg = ERROR_MESSAGES[error] || error
    const details = searchParams.get('details')
    return (
      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {msg}
        {details && <p className="mt-2 text-xs opacity-80">Details: {details}</p>}
      </div>
    )
  }

  return null
}
