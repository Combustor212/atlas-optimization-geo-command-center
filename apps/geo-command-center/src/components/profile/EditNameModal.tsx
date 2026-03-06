'use client'

import { useState } from 'react'
import { User, Loader2, Mail, Lock, Check, X, AlertCircle } from 'lucide-react'

interface EditNameModalProps {
  currentName: string | null
  currentEmail: string
  onSuccess: () => void
}

export function EditNameModal({ currentName, currentEmail, onSuccess }: EditNameModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(currentName || '')
  const [email, setEmail] = useState(currentEmail)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isChangingEmail = email !== currentEmail
  const isChangingPassword = newPassword.length > 0
  const requiresPassword = isChangingEmail || isChangingPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validate name if changing
    if (!name.trim()) {
      setError('Name cannot be empty')
      return
    }

    // If changing email, validate email and require password
    if (isChangingEmail) {
      if (!email.trim() || !email.includes('@')) {
        setError('Valid email is required')
        return
      }
      if (!currentPassword) {
        setError('Current password is required to change email')
        return
      }
    }

    // If changing password, validate passwords
    if (isChangingPassword) {
      if (!currentPassword) {
        setError('Current password is required to change password')
        return
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match')
        return
      }
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // Always update name if changed
      if (name !== currentName) {
        const nameResponse = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: name.trim() }),
        })

        if (!nameResponse.ok) {
          throw new Error('Failed to update name')
        }
      }

      // Update email if changed
      if (isChangingEmail) {
        const emailResponse = await fetch('/api/profile/update-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: email.trim(),
            currentPassword: currentPassword 
          }),
        })

        if (!emailResponse.ok) {
          const data = await emailResponse.json()
          throw new Error(data.error || 'Failed to update email')
        }
      }

      // Update password if provided
      if (isChangingPassword) {
        const passwordResponse = await fetch('/api/profile/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            currentPassword: currentPassword,
            newPassword: newPassword 
          }),
        })

        if (!passwordResponse.ok) {
          const data = await passwordResponse.json()
          throw new Error(data.error || 'Failed to update password')
        }
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => {
        setIsOpen(false)
        onSuccess()
      }, 1500)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    if (!isLoading) {
      setIsOpen(false)
      setName(currentName || '')
      setEmail(currentEmail)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      setSuccess('')
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <User className="mr-2 inline-block h-4 w-4" />
        Edit Profile
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={handleClose}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">
              Edit Your Profile
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                >
                  <User className="h-4 w-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError('')
                  }}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                >
                  <Mail className="h-4 w-4" />
                  Email Address
                  <span className="ml-1 text-xs text-[var(--muted)] font-normal">(editable)</span>
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
                  className="w-full rounded-lg border-2 border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none disabled:opacity-50 transition-all cursor-text"
                  placeholder="Enter your email"
                />
                {isChangingEmail && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-500">
                      Password required to change email. You&apos;ll need to verify your new email address.
                    </p>
                  </div>
                )}
              </div>

              {/* Password Section */}
              <div className="border-t border-[var(--card-border)] pt-4">
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
                  Change Password (Optional)
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                    >
                      <Lock className="h-4 w-4" />
                      New Password
                    </label>
                    <input
                      type="password"
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        setError('')
                      }}
                      disabled={isLoading}
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  {isChangingPassword && (
                    <>
                      <div>
                        <label
                          htmlFor="confirm-password"
                          className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                        >
                          <Lock className="h-4 w-4" />
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="confirm-password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            setError('')
                          }}
                          disabled={isLoading}
                          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                          placeholder="Confirm your new password"
                        />
                        {confirmPassword && (
                          <div className="mt-1 flex items-center gap-1 text-xs">
                            {newPassword === confirmPassword ? (
                              <>
                                <Check className="h-3 w-3 text-green-500" />
                                <span className="text-green-500">Passwords match</span>
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 text-red-500" />
                                <span className="text-red-500">Passwords do not match</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-500">
                          Current password required to change password
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Current Password - Only show when needed */}
              {requiresPassword && (
                <div className="border-t border-[var(--card-border)] pt-4">
                  <label
                    htmlFor="current-password"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                  >
                    <Lock className="h-4 w-4 text-red-500" />
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      setError('')
                    }}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-red-500/50 bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                    placeholder="Enter your current password to confirm changes"
                    required
                  />
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Required to change email or password
                  </p>
                </div>
              )}

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
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
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
