import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'staff' | 'client'

export interface SessionUser {
  id: string
  email: string
  role: UserRole
  agency_id: string | null
  client_id: string | null
}

export interface AgencyScope {
  agency_id: string
  role: UserRole
  client_id?: string | null
  user_id: string
}

/**
 * Get the current authenticated user with their role and scope
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('agency_id, client_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return null

  return {
    id: user.id,
    email: user.email || '',
    role: profile.role as UserRole,
    agency_id: profile.agency_id,
    client_id: profile.client_id,
  }
}

/**
 * Require specific role(s) or redirect to login/unauthorized
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectUrl: string = '/login'
): Promise<SessionUser> {
  const user = await getSessionUser()
  
  if (!user) {
    redirect(redirectUrl)
  }

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized')
  }

  return user
}

/**
 * Get agency scope for current user - ensures agency members only access their agency data
 */
export async function getAgencyScope(): Promise<AgencyScope | null> {
  const user = await getSessionUser()
  
  if (!user) return null
  
  // Clients must have a client_id
  if (user.role === 'client' && !user.client_id) {
    return null
  }
  
  // Admin and staff must have an agency_id
  if ((user.role === 'admin' || user.role === 'staff') && !user.agency_id) {
    return null
  }

  return {
    agency_id: user.agency_id || '',
    role: user.role,
    client_id: user.client_id,
    user_id: user.id,
  }
}

/**
 * Verify that a resource belongs to the user's agency
 * Used for additional server-side validation even with RLS
 */
export async function verifyAgencyAccess(
  resourceAgencyId: string,
  userAgencyId: string
): Promise<boolean> {
  return resourceAgencyId === userAgencyId
}

/**
 * Get client_id for client-scoped access
 * Returns null if user is not a client or doesn't have client_id
 */
export async function getClientScope(): Promise<string | null> {
  const user = await getSessionUser()
  
  if (!user || user.role !== 'client' || !user.client_id) {
    return null
  }
  
  return user.client_id
}

/**
 * Check if user has permission to access specific client data
 */
export async function canAccessClient(clientId: string): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false

  // Admin and staff can access any client in their agency
  if (user.role === 'admin' || user.role === 'staff') {
    const supabase = await createClient()
    const { data: client } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', clientId)
      .single()
    
    return client?.agency_id === user.agency_id
  }

  // Clients can only access their own data
  if (user.role === 'client') {
    return user.client_id === clientId
  }

  return false
}
