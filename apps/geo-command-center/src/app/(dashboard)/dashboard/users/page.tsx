import { redirect } from 'next/navigation'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getAllUsers, getCurrentUser } from '@/lib/data/users'
import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/users/RoleBadge'
import { UsersTable } from '@/components/users/UsersTable'
import { AdminSummaryCard } from '@/components/users/AdminSummaryCard'
import { InviteUserButton } from '@/components/users/InviteUserButton'
import { Users as UsersIcon } from 'lucide-react'

export default async function UsersPage() {
  const currentUser = await getCurrentUser()
  const { agencyId } = (await getCurrentUserAgency()) || {}
  
  if (!agencyId || !currentUser) {
    redirect('/login')
  }

  // Only admins can access this page
  if (currentUser.role !== 'admin') {
    redirect('/dashboard')
  }

  const users = await getAllUsers(agencyId)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">User Management</h1>
          <p className="mt-1 text-[var(--muted)]">
            Manage users, roles, and permissions for your agency
          </p>
        </div>
        <InviteUserButton />
      </div>

      {/* Admin Summary Card */}
      <div className="mb-6">
        <AdminSummaryCard />
      </div>

      {users.length === 0 ? (
        <Card className="py-12 text-center">
          <UsersIcon className="mx-auto h-12 w-12 text-[var(--muted)]" />
          <p className="mt-4 text-[var(--muted)]">No users found</p>
        </Card>
      ) : (
        <>
          {/* Admins Section */}
          <UsersTable 
            users={users} 
            currentUserId={currentUser.id} 
            role="admin"
            title="Administrators"
          />

          {/* Staff Section */}
          <UsersTable 
            users={users} 
            currentUserId={currentUser.id} 
            role="staff"
            title="Staff Members"
          />

          {/* Clients Section */}
          <UsersTable 
            users={users} 
            currentUserId={currentUser.id} 
            role="client"
            title="Clients"
          />
        </>
      )}

      <div className="mt-6 rounded-lg border border-[var(--card-border)] bg-[var(--accent-muted)]/30 p-4">
        <h3 className="font-medium text-[var(--foreground)]">Role Permissions</h3>
        <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <div className="flex items-start gap-2">
            <RoleBadge role="admin" className="mt-0.5" />
            <p>Full access to all features, can manage users and settings</p>
          </div>
          <div className="flex items-start gap-2">
            <RoleBadge role="staff" className="mt-0.5" />
            <p>Can view and manage clients, locations, and reports</p>
          </div>
          <div className="flex items-start gap-2">
            <RoleBadge role="client" className="mt-0.5" />
            <p>Limited access to their own data and reports only</p>
          </div>
        </div>
      </div>
    </div>
  )
}
