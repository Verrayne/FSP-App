import { createContext } from 'react'

import type { AuthState } from '../types/auth'

export interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
  completePasswordRecovery: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
