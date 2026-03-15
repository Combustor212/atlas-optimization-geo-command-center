'use server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { revalidatePath } from 'next/cache'

/**
 * Form action: delete a lead. Admin only. Uses service role to bypass RLS.
 */
export async function deleteLeadFormAction(formData: FormData): Promise<void> {
  const leadId = formData.get('leadId') as string
  if (!leadId) return
  await deleteLeadAction(leadId)
}

/**
 * Delete a lead. Admin only. Uses service role to bypass RLS.
 */
export async function deleteLeadAction(leadId: string): Promise<{ error?: string }> {
  const currentUser = await getCurrentUserAgency()
  if (!currentUser?.agencyId || currentUser.role !== 'admin') {
    return { error: 'Forbidden' }
  }

  const admin = getSupabaseAdmin()
  const { data: existing, error: fetchError } = await admin
    .from('leads')
    .select('id, agency_id')
    .eq('id', leadId)
    .single()

  if (fetchError || !existing) {
    return { error: 'Lead not found' }
  }

  const { error } = await admin.from('leads').delete().eq('id', leadId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/leads')
  return {}
}
