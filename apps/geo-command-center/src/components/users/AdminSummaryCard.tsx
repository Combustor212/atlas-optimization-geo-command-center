'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Shield, Users, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { UserWithAuth } from '@/lib/data/users'

export function AdminSummaryCard() {
  const [admins, setAdmins] = useState<UserWithAuth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAdmins() {
      try {
        const response = await fetch('/api/users/admins')
        if (response.ok) {
          const data = await response.json()
          setAdmins(data.admins)
        }
      } catch (error) {
        console.error('Error fetching admins:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdmins()
  }, [])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">System Administrators</h3>
            <p className="text-sm text-[var(--muted)]">Loading...</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">System Administrators</h3>
          <p className="text-sm text-[var(--muted)]">
            <Users className="inline h-3 w-3 mr-1" />
            {admins.length} {admins.length === 1 ? 'admin' : 'admins'} in the system
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {admins.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">
            No administrators found
          </p>
        ) : (
          admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-start gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--accent-muted)]/30 p-3 transition-colors hover:border-[var(--accent)]"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-medium text-white">
                {(admin.full_name || admin.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--foreground)] truncate">
                  {admin.full_name || 'Unnamed Admin'}
                </p>
                <p className="text-sm text-[var(--muted)] truncate">{admin.email}</p>
                {admin.last_sign_in_at && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-[var(--muted)]">
                    <Clock className="h-3 w-3" />
                    Last active {formatDistanceToNow(new Date(admin.last_sign_in_at), { addSuffix: true })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
