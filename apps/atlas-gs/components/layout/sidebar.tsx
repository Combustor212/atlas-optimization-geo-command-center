'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  FileText,
  Receipt,
  CheckSquare,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Businesses', href: '/businesses', icon: Building2 },
  { name: 'Deals', href: '/deals', icon: Briefcase },
  { name: 'Contracts', href: '/contracts', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Image 
            src="/atlas-logo.png" 
            alt="Atlas GS Logo" 
            width={40} 
            height={40}
            className="object-contain"
          />
          <h1 className="text-2xl font-bold">Atlas GS</h1>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 text-xs text-slate-400 border-t border-slate-800">
        Atlas GS v0.1.0
      </div>
    </div>
  )
}

