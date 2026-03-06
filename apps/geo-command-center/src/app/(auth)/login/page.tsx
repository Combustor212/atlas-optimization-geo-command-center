'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        const msg = signInError.message
        if (msg.includes('fetch') || msg.includes('network') || msg.toLowerCase().includes('failed to fetch')) {
          setError('Cannot reach Supabase. Check: 1) Supabase URL & anon key in .env.local 2) Project not paused at supabase.com/dashboard 3) Network.')
        } else {
          setError(msg)
        }
        setLoading(false)
        return
      }
      const userId = data.user?.id
      let role: string | null = null
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
        role = profile?.role ?? null
      }
      setLoading(false)
      // Full page navigation so session cookies are sent
      // Honor returnTo from AGS/other apps, or use role-based default
      const defaultDest = role === 'client' ? '/portal' : '/dashboard'
      const destination = returnTo && returnTo.startsWith('/') && !returnTo.includes('//') ? returnTo : defaultDest
      window.location.replace(destination)
    } catch (err) {
      setLoading(false)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        setError('Cannot reach Supabase. Check: 1) Supabase URL & anon key in .env.local 2) Project is not paused at supabase.com/dashboard 3) Network connection.')
      } else {
        setError(msg)
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            GEO Command Center
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sign in to your account
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-[var(--danger-muted)]/50 p-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="you@agency.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            Demo: Use your Supabase auth credentials
          </p>
        </form>
      </div>
    </div>
  )
}
