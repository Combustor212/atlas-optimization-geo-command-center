import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types/database'

export interface UserWithAuth extends Profile {
  email: string
  last_sign_in_at: string | null
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createAdminClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function getAllUsers(agencyId: string): Promise<UserWithAuth[]> {
  const supabase = await createClient()
  const adminClient = getSupabaseAdmin()
  
  // Get all profiles for the agency
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })

  if (profilesError || !profiles) {
    console.error('Error fetching profiles:', profilesError)
    return []
  }

  // Get auth users data using admin client
  const users: UserWithAuth[] = []
  
  for (const profile of profiles) {
    // Get auth user email from Supabase auth (this requires service role)
    const { data: { user } } = await adminClient.auth.admin.getUserById(profile.id)
    
    if (user) {
      users.push({
        ...profile,
        email: user.email || 'No email',
        last_sign_in_at: user.last_sign_in_at || null,
      })
    }
  }

  return users
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    ...profile,
    email: user.email || 'No email',
    last_sign_in_at: user.last_sign_in_at || null,
  } as UserWithAuth
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`)
  }

  return { success: true }
}
