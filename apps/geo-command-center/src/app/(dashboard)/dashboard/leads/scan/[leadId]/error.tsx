'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function ScanReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Scan Report] Error:', error)
  }, [error])

  return (
    <div className="p-4 sm:p-8 w-full max-w-full">
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leads
      </Link>
      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-red-900 dark:text-red-100 mb-1">
              Unable to load scan report
            </h2>
            <p className="text-sm text-red-800 dark:text-red-200 mb-4">
              {error.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={reset}
              className="text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
