'use client'

import { useState } from 'react'
import { Key, Loader2 } from 'lucide-react'

interface ResetPasswordButtonProps {
  userId: string
  email: string
}

export function ResetPasswordButton({ userId, email }: ResetPasswordButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleResetPassword() {
    if (!confirm(`Send password reset email to ${email}?`)) {
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }

      setMessage('Reset email sent!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error resetting password:', error)
      setMessage('Failed to send reset email')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleResetPassword}
        disabled={isLoading}
        className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-2 text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
        title="Reset password"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Key className="h-4 w-4" />
        )}
      </button>
      {message && (
        <span className={`text-xs ${message.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
