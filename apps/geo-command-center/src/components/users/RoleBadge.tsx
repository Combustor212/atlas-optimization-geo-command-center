'use client'

import type { UserRole } from '@/types/database'
import { Shield, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  role: UserRole
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = {
    admin: {
      label: 'Admin',
      icon: Shield,
      className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    },
    staff: {
      label: 'Staff',
      icon: Users,
      className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    client: {
      label: 'Client',
      icon: User,
      className: 'bg-green-500/10 text-green-500 border-green-500/20',
    },
  }

  const { label, icon: Icon, className: roleClassName } = config[role]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        roleClassName,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
