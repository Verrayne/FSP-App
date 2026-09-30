import type { VercelRequest } from '@vercel/node'

import {
  createSupabaseServerClient,
  createSupabaseUserServerClient,
} from '../../src/lib/supabase/server.js'

export async function requirePlatformAdmin(request: VercelRequest) {
  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Bearer ')) throw new Error('UNAUTHENTICATED')
  const token = authorization.slice(7)
  const userClient = createSupabaseUserServerClient(token)
  const userResult = await userClient.auth.getUser()
  if (userResult.error || !userResult.data.user) throw new Error('UNAUTHENTICATED')
  const service = createSupabaseServerClient()
  const membership = await service
    .from('platform_memberships')
    .select('id')
    .eq('user_id', userResult.data.user.id)
    .eq('role', 'PLATFORM_ADMIN')
    .eq('status', 'ACTIVE')
    .maybeSingle()
  if (membership.error || !membership.data) throw new Error('FORBIDDEN')
  return { service, userClient, user: userResult.data.user }
}
