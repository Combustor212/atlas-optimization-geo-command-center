import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ConnectGoogleCalendarButton } from '@/components/integrations/ConnectGoogleCalendarButton'
import { GoogleCalendarCallbackBanner } from '@/components/integrations/GoogleCalendarCallbackBanner'
import { Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) {
    redirect('/dashboard')
  }

  let isGoogleCalendarConnected = false
  try {
    const supabase = getSupabaseAdmin()
    const { data: token } = await supabase
      .from('google_calendar_oauth_tokens')
      .select('id')
      .eq('agency_id', agencyId)
      .maybeSingle()
    isGoogleCalendarConnected = !!token
  } catch (err) {
    console.warn('Settings: google_calendar_oauth_tokens query failed (table may not exist):', err)
  }

  return (
    <div className="p-8">
      <Suspense fallback={null}>
        <GoogleCalendarCallbackBanner />
      </Suspense>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
        <p className="mt-1 text-[var(--muted)]">Manage integrations and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book a Call – Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Connect your Google account so visitors can book consultation calls and receive
            Google Meet links. Only one admin needs to connect; the calendar will be used
            for all Book a Call bookings from the AGS website.
          </p>
          <ConnectGoogleCalendarButton isConnected={isGoogleCalendarConnected} />
          {isGoogleCalendarConnected && (
            <p className="text-sm text-green-600">Google Calendar is connected.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
