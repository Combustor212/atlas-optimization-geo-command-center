'use client'

import { useState } from 'react'
import type { UserRole } from '@/types/database'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoleSelectProps {
  currentRole: UserRole
  userId: string
  onUpdate?: () => void
}

export function RoleSelect({ currentRole, userId, onUpdate }: RoleSelectProps) {
  const [role, setRole] = useState<UserRole>(currentRole)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const roles: { value: UserRole; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'staff', label: 'Staff' },
    { value: 'client', label: 'Client' },
  ]

  async function handleRoleChange(newRole: UserRole) {
    if (newRole === role) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!response.ok) {
        throw new Error('Failed to update role')
      }

      setRole(newRole)
      onUpdate?.()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role. Please try again.')
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:border-[var(--accent)] disabled:opacity-50"
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRoleChange(r.value)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--accent-muted)]',
                  r.value === role ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'
                )}
              >
                {r.label}
                {r.value === role && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
