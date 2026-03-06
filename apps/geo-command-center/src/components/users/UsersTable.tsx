'use client'

import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/users/RoleBadge'
import { RoleSelect } from '@/components/users/RoleSelect'
import { ResetPasswordButton } from '@/components/users/ResetPasswordButton'
import { Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { UserWithAuth } from '@/lib/data/users'
import type { UserRole } from '@/types/database'

interface UsersTableProps {
  users: UserWithAuth[]
  currentUserId: string
  role: UserRole
  title: string
}

export function UsersTable({ users, currentUserId, role, title }: UsersTableProps) {
  const filteredUsers = users.filter((user) => user.role === role)

  if (filteredUsers.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        <RoleBadge role={role} />
        <span className="text-sm text-[var(--muted)]">({filteredUsers.length})</span>
      </div>
      
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[var(--card-border)] bg-[var(--accent-muted)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Last Sign In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUserId
                return (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-[var(--accent-muted)]/30"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {user.full_name || 'Unnamed User'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-[var(--muted)]">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-[var(--muted)]">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isCurrentUser ? (
                        <RoleBadge role={user.role} />
                      ) : (
                        <RoleSelect 
                          currentRole={user.role} 
                          userId={user.id}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Clock className="h-4 w-4" />
                        {user.last_sign_in_at
                          ? formatDistanceToNow(new Date(user.last_sign_in_at), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!isCurrentUser && (
                        <ResetPasswordButton userId={user.id} email={user.email} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
