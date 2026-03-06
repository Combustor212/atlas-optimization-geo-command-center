'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EditNameModal } from '@/components/profile/EditNameModal'
import { useRouter } from 'next/navigation'

export function UserProfileSection() {
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', authUser.id)
          .single()

        setUser({
          email: authUser.email || '',
          name: profile?.full_name || null,
        })
      }
    }

    loadUser()
  }, [])

  if (!user) return null

  return (
    <div className="border-t border-[var(--card-border)] p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]">
          <User className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">
            {user.name || 'Unnamed User'}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
        </div>
      </div>
      <EditNameModal 
        currentName={user.name}
        currentEmail={user.email}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
