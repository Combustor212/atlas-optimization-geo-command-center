import { createClient } from '@/lib/supabase/server'

export async function getCurrentUserAgency() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) return null
  return { agencyId: profile.agency_id, role: profile.role }
}

export async function getOrCreateAgencyForUser(userId: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', userId)
    .single()

  if (profile?.agency_id) return profile.agency_id

  const { data: agency } = await supabase
    .from('agencies')
    .insert({
      name: 'My Agency',
      slug: `agency-${userId.slice(0, 8)}`,
    })
    .select('id')
    .single()

  if (agency) {
    await supabase
      .from('profiles')
      .upsert({
        id: userId,
        agency_id: agency.id,
        role: 'admin',
      })
    return agency.id
  }
  return null
}
