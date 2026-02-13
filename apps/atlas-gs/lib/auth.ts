import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: UserRole
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  if (!supabaseUser?.email) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', supabaseUser.id)
    .single()

  let prismaUser = await prisma.user.findFirst({
    where: {
      OR: [
        { supabaseUserId: supabaseUser.id },
        { email: supabaseUser.email },
      ],
    },
  })

  if (!prismaUser) {
    const defaultRole = profile?.role === 'admin' ? 'ADMIN' : 'TEAM'
    prismaUser = await prisma.user.create({
      data: {
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name ?? supabaseUser.email?.split('@')[0],
        password: 'supabase-auth', // Placeholder - not used for auth
        supabaseUserId: supabaseUser.id,
        role: defaultRole,
      },
    })
  } else if (!prismaUser.supabaseUserId) {
    await prisma.user.update({
      where: { id: prismaUser.id },
      data: { supabaseUserId: supabaseUser.id },
    })
  }

  if (profile) {
    const roleFromProfile = (profile.role === 'admin' ? 'ADMIN' : 'TEAM') as UserRole
    if (prismaUser.role !== roleFromProfile) {
      await prisma.user.update({
        where: { id: prismaUser.id },
        data: { role: roleFromProfile },
      })
      prismaUser.role = roleFromProfile
    }
  }

  return {
    id: prismaUser.id,
    email: prismaUser.email,
    name: prismaUser.name,
    role: prismaUser.role,
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }
  return user
}
