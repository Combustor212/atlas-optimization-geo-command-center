'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { revalidatePath } from 'next/cache'

export async function createClientAction(formData: FormData) {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('clients').insert({
    agency_id: agencyId,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: (formData.get('phone') as string) || null,
    business_name: (formData.get('business_name') as string) || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function createLocationAction(formData: FormData) {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) return { error: 'Unauthorized' }

  const clientId = formData.get('client_id') as string
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('agency_id').eq('id', clientId).single()
  if (client?.agency_id !== agencyId) return { error: 'Forbidden' }

  const { error } = await supabase.from('locations').insert({
    client_id: clientId,
    name: formData.get('name') as string,
    address: (formData.get('address') as string) || null,
    city: (formData.get('city') as string) || null,
    state: (formData.get('state') as string) || null,
    zip: (formData.get('zip') as string) || null,
    avg_repair_ticket: Number(formData.get('avg_repair_ticket')) || 0,
    avg_daily_jobs: Number(formData.get('avg_daily_jobs')) || 0,
    conversion_rate: Number(formData.get('conversion_rate')) || 20,
  })
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  revalidatePath('/dashboard/geo')
  return { success: true }
}

export async function updateLocationAction(formData: FormData) {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) return { error: 'Unauthorized' }

  const locationId = formData.get('location_id') as string
  const supabase = await createClient()
  
  // Verify ownership
  const { data: loc } = await supabase.from('locations').select('client_id').eq('id', locationId).single()
  if (!loc) return { error: 'Location not found' }
  const { data: client } = await supabase.from('clients').select('agency_id').eq('id', loc.client_id).single()
  if (client?.agency_id !== agencyId) return { error: 'Forbidden' }

  const { error } = await supabase.from('locations').update({
    name: formData.get('name') as string,
    address: (formData.get('address') as string) || null,
    city: (formData.get('city') as string) || null,
    state: (formData.get('state') as string) || null,
    zip: (formData.get('zip') as string) || null,
    avg_repair_ticket: Number(formData.get('avg_repair_ticket')) || 0,
    avg_daily_jobs: Number(formData.get('avg_daily_jobs')) || 0,
    conversion_rate: Number(formData.get('conversion_rate')) || 20,
  }).eq('id', locationId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/clients/${loc.client_id}`)
  revalidatePath('/dashboard/geo')
  return { success: true }
}

export async function addRankingAction(formData: FormData) {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) return { error: 'Unauthorized' }

  const locationId = formData.get('location_id') as string
  const supabase = await createClient()
  const { data: loc } = await supabase.from('locations').select('client_id').eq('id', locationId).single()
  if (!loc) return { error: 'Location not found' }
  const { data: client } = await supabase.from('clients').select('agency_id').eq('id', loc.client_id).single()
  if (client?.agency_id !== agencyId) return { error: 'Forbidden' }

  const { error } = await supabase.from('rankings').insert({
    location_id: locationId,
    keyword: formData.get('keyword') as string,
    keyword_type: (formData.get('keyword_type') as string) || 'primary',
    map_pack_position: formData.get('map_pack_position') ? Number(formData.get('map_pack_position')) : null,
    organic_position: formData.get('organic_position') ? Number(formData.get('organic_position')) : null,
    source: 'manual',
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/geo')
  revalidatePath(`/dashboard/clients/${loc.client_id}`)
  return { success: true }
}

export async function deleteClientAction(clientId: string) {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  
  // Verify ownership
  const { data: client } = await supabase
    .from('clients')
    .select('agency_id')
    .eq('id', clientId)
    .single()
  
  if (!client) return { error: 'Client not found' }
  if (client.agency_id !== agencyId) return { error: 'Forbidden' }

  // Delete client (cascade should handle related records)
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
  
  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/geo')
  return { success: true }
}
