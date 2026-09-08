import { createClient } from '@supabase/supabase-js'

import { publicEnv } from '../../config/env'

let browserClient: ReturnType<typeof createClient> | undefined

export function getSupabaseBrowserClient() {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key } = publicEnv

  if (!url || !key) {
    throw new Error(
      'Supabase browser configuration is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  browserClient ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  return browserClient
}
