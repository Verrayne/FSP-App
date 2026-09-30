import type { Session, User } from '@supabase/supabase-js'

import type { Database } from '../../../types/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthState {
  status: AuthStatus
  session: Session | null
  user: User | null
  profile: Profile | null
  profileError: boolean
  isPasswordRecovery: boolean
}
