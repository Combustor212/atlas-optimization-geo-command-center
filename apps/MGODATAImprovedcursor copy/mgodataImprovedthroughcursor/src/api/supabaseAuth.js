import { supabase } from '@/lib/supabase';
import { User as LocalStorageUser } from './localStorageClient';

/**
 * Supabase-backed auth for AGS. Uses same Supabase project as GEO Command Center.
 * When Supabase is configured, sign in happens on AGS and user stays on AGS.
 */
async function getSupabaseUser() {
  if (!supabase) return null;
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, agency_id')
    .eq('id', authUser.id)
    .single();

  let companyName = 'AGS';
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from('agencies')
      .select('name')
      .eq('id', profile.agency_id)
      .single();
    companyName = agency?.name || companyName;
  }

  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
    role: profile?.role || 'staff',
    companyName,
    companyLogoUrl: null,
    plan: 'PRO',
    subscriptionStatus: 'active'
  };
}

export const User = {
  me: async () => {
    const supabaseUser = await getSupabaseUser();
    if (supabaseUser) return supabaseUser;
    const localUser = await LocalStorageUser.me();
    if (localUser) return localUser;
    return null;
  },
  current: async () => User.me(),
  logout: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('mgo_current_user');
    return { success: true };
  },
  signOut: async () => User.logout(),
  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },
  signUp: async (email, password, options = {}) => {
    if (!supabase) throw new Error('Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: options.full_name,
          business_name: options.business_name
        }
      }
    });
    if (error) throw error;
    if (data.user && data.session) {
      try {
        await supabase.from('profiles').update({
          full_name: options.full_name || data.user.email?.split('@')[0]
        }).eq('id', data.user.id);
      } catch (_) {
        // Profile update may fail due to RLS or timing; user is still created
      }
    }
    return { user: data.user, session: data.session };
  }
};
