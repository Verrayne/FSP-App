import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
})

export function createSupabaseServerClient() {
  const parsed = serverEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    throw new Error('Server Supabase configuration is missing or invalid.')
  }

  return createClient(parsed.data.SUPABASE_URL, parsed.data.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
