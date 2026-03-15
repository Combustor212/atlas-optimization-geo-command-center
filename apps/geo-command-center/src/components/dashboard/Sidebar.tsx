'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Calculator,
  MapPin,
  CreditCard,
  LogOut,
  UserCog,
  FileText,
  CheckSquare,
  TrendingUp,
  Brain,
  UserPlus,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { UserProfileSection } from '@/components/profile/UserProfileSection'

const navItems = [
  { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/leads', label: 'Leads', icon: UserPlus },
  { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/dashboard/calculator', label: 'Revenue Calculator', icon: Calculator },
  { href: '/dashboard/geo', label: 'GEO Tracking', icon: MapPin },
  { href: '/dashboard/reports', label: 'Report Schedules', icon: FileText },
  { href: '/dashboard/ai-mentions', label: 'AI Mentions', icon: Brain },
  { href: '/dashboard/tasks', label: 'Tasks & Workflow', icon: CheckSquare },
  { href: '/dashboard/upsells', label: 'Upsells Pipeline', icon: TrendingUp },
  { href: '/dashboard/users', label: 'Users', icon: UserCog },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 min-w-64 shrink-0 flex-col overflow-hidden border-r border-[var(--card-border)] bg-[var(--card)]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[var(--card-border)] p-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/ags-logo.png"
              alt="Geo Command Center"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="truncate text-xl font-bold text-[var(--foreground)]">
              Geo Command Center
            </span>
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            // For the root dashboard, only match exact path
            // For other routes, match if pathname starts with the href
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted)] hover:bg-[var(--accent-muted)] hover:text-[var(--foreground)]'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="shrink-0">
          <UserProfileSection />
        </div>
        <div className="shrink-0 border-t border-[var(--card-border)] p-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--danger-muted)]/30 hover:text-[var(--danger)]"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}
