import { z } from 'zod'

const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_').optional(),
  VITE_APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
})

const parsed = publicEnvSchema.safeParse(import.meta.env)

if (!parsed.success) throw new Error('Invalid public environment configuration.')

const hasUrl = Boolean(parsed.data.VITE_SUPABASE_URL)
const hasKey = Boolean(parsed.data.VITE_SUPABASE_PUBLISHABLE_KEY)

if (hasUrl !== hasKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must either both be set or both be omitted.',
  )
}

export const publicEnv = parsed.data
export const isSupabaseConfigured = hasUrl && hasKey
