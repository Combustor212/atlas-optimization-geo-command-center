import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'client') redirect('/portal')
    redirect('/dashboard')
  }

  // Unauthenticated: redirect to login (admin.atlasgrowths.com → /login)
  redirect('/login')
}
