import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/**
 * Supabase client with service role key. Use only for server-side operations
 * that need to bypass RLS (e.g. cron jobs, storage uploads, admin actions).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase admin env vars not configured')
    adminClient = createClient(url, key)
  }
  return adminClient
}
