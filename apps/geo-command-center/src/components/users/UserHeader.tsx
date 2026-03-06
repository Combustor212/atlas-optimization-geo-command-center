'use client'

import { EditNameModal } from '@/components/profile/EditNameModal'
import { useRouter } from 'next/navigation'

interface UserHeaderProps {
  currentUserName: string | null
  currentUserEmail: string
}

export function UserHeader({ currentUserName, currentUserEmail }: UserHeaderProps) {
  const router = useRouter()

  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">User Management</h1>
        <p className="mt-1 text-[var(--muted)]">
          Manage users, roles, and permissions for your agency
        </p>
      </div>
      <EditNameModal 
        currentName={currentUserName}
        currentEmail={currentUserEmail}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
