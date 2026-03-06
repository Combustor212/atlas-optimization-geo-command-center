'use client'

import { InviteUserModal } from '@/components/users/InviteUserModal'
import { useRouter } from 'next/navigation'

export function InviteUserButton() {
  const router = useRouter()

  return (
    <InviteUserModal 
      onSuccess={() => {
        router.refresh()
      }} 
    />
  )
}
