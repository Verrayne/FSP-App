import { z } from 'zod'

const productionUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === 'https:')

export function getTrustedAppUrl() {
  const value = process.env.APP_URL ?? process.env.PUBLIC_APP_URL
  if (process.env.VERCEL_ENV === 'production' || process.env.APP_ENV === 'production')
    return productionUrl.parse(value)
  return z.string().url().catch('http://localhost:5173').parse(value)
}
