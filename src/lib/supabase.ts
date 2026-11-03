import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isDemoLoginAllowed } from './localDemo'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. Copy .env.example to .env.local and add your project URL and anon key.')
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return client
}

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function isDemoLoginEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return isDemoLoginAllowed(
    import.meta.env.DEV,
    window.location.hostname,
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true',
  )
}

