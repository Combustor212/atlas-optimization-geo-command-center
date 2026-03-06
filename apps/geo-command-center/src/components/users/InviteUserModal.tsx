'use client'

import { useState } from 'react'
import { UserPlus, Loader2, Mail, User as UserIcon, Shield } from 'lucide-react'
import type { UserRole } from '@/types/database'

interface InviteUserModalProps {
  onSuccess: () => void
}

export function InviteUserModal({ onSuccess }: InviteUserModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('staff')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(),
          fullName: fullName.trim() || null,
          role 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user')
      }

      setSuccess(data.message)
      setTimeout(() => {
        setIsOpen(false)
        setEmail('')
        setFullName('')
        setRole('staff')
        setError('')
        setSuccess('')
        onSuccess()
      }, 2000)
    } catch (err) {
      console.error('Error inviting user:', err)
      setError(err instanceof Error ? err.message : 'Failed to invite user. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    if (!isLoading) {
      setIsOpen(false)
      setEmail('')
      setFullName('')
      setRole('staff')
      setError('')
      setSuccess('')
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
      >
        <UserPlus className="h-4 w-4" />
        Invite User
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={handleClose}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">
              Invite New User
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                >
                  <Mail className="h-4 w-4" />
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  disabled={isLoading}
                  required
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                  placeholder="user@example.com"
                />
              </div>

              {/* Full Name Field */}
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                >
                  <UserIcon className="h-4 w-4" />
                  Full Name <span className="text-xs text-[var(--muted)]">(optional)</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                  placeholder="John Doe"
                />
              </div>

              {/* Role Field */}
              <div>
                <label
                  htmlFor="role"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                >
                  <Shield className="h-4 w-4" />
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                >
                  <option value="admin">Admin - Full access</option>
                  <option value="staff">Staff - Can manage clients and data</option>
                  <option value="client">Client - Limited to own data</option>
                </select>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  They&apos;ll receive an email to set their password
                </p>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                  <p className="text-sm text-green-500">{success}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  )
}
