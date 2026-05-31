import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Returns the current user from the locally-cached session.
// Uses getSession() (reads local storage, no network round-trip) rather than
// getUser() (which calls the auth server) — security is enforced by RLS, so we
// only need the id/email here. This removes a serialized network call from
// every page load and every insert/update/delete.
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}