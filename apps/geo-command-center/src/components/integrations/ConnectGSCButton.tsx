'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface ConnectGSCButtonProps {
  clientId?: string | null
  locationId?: string | null
  className?: string
  children?: React.ReactNode
}

/**
 * Initiates GSC OAuth flow. Redirects user to Google to connect.
 * TODO: Add GSC_CLIENT_ID, GSC_CLIENT_SECRET to env for full OAuth.
 */
export function ConnectGSCButton({
  clientId,
  locationId,
  className = '',
  children,
}: ConnectGSCButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clientId) params.set('client_id', clientId)
      if (locationId) params.set('location_id', locationId)
      const res = await fetch(`/api/integrations/gsc/connect?${params}`)
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || json.hint || 'Failed to connect GSC')
        return
      }
      if (json.authUrl) {
        window.location.href = json.authUrl
      }
    } catch {
      alert('Failed to connect GSC')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-muted)] disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      {children ?? 'Connect Google Search Console'}
    </button>
  )
}
