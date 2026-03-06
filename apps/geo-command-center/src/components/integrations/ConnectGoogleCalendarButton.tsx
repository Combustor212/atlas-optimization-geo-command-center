'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface ConnectGoogleCalendarButtonProps {
  isConnected?: boolean
  className?: string
  children?: React.ReactNode
}

/**
 * Initiates Google Calendar OAuth flow. Admin-only.
 * Uses a direct link so the server redirects to Google (no fetch/JS).
 */
export function ConnectGoogleCalendarButton({
  isConnected = false,
  className = '',
  children,
}: ConnectGoogleCalendarButtonProps) {
  if (isConnected) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] opacity-50 cursor-not-allowed ${className}`}
      >
        <ExternalLink className="h-4 w-4" />
        {children ?? 'Google Calendar Connected'}
      </div>
    )
  }

  return (
    <Link
      href="/api/integrations/google-calendar/connect"
      className={`inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-muted)] ${className}`}
    >
      <ExternalLink className="h-4 w-4" />
      {children ?? 'Connect Google Calendar'}
    </Link>
  )
}
