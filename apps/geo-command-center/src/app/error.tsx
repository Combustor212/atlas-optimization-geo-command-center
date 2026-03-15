'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)] p-8">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-[var(--muted)]">The page encountered an error. Try again.</p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
      <a
        href="/dashboard"
        className="mt-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        Back to Dashboard
      </a>
    </div>
  )
}
