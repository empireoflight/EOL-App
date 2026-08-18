import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate that we have real-looking credentials (not placeholders). Accepts
// http:// too — local Supabase (`supabase start`) serves plain HTTP, only
// hosted projects are always https://.
const isConfigured = /^https?:\/\//.test(supabaseUrl ?? '') && supabaseAnonKey?.length > 20

if (!isConfigured) {
  console.warn(
    '[Empire of Light] Supabase is not configured. ' +
    'Copy .env.example to .env.local and add your project URL and anon key.'
  )
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const isSupabaseConfigured = isConfigured
