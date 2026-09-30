import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { publicEnv } from '../../config/env'
import type { Database } from '../../types/database.types'

let browserClient: SupabaseClient<Database> | undefined

export function getSupabaseBrowserClient() {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key } = publicEnv

  if (!url || !key) {
    throw new Error(
      'Supabase browser configuration is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  browserClient ??= createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })

  return browserClient
}
