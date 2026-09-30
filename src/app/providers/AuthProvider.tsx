import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { isSupabaseConfigured } from '../../config/env'
import { getSupabaseBrowserClient } from '../../lib/supabase/client'
import { AuthContext, type AuthContextValue } from '../../features/auth/context/AuthContext'
import type { AuthState } from '../../features/auth/types/auth'

const recoveryStorageKey = 'fsp-password-recovery'

const initialState: AuthState = {
  status: isSupabaseConfigured ? 'loading' : 'anonymous',
  session: null,
  user: null,
  profile: null,
  profileError: false,
  isPasswordRecovery: false,
}

function storedRecoveryState() {
  try {
    return window.sessionStorage.getItem(recoveryStorageKey) === 'true'
  } catch {
    return false
  }
}

function storeRecoveryState(active: boolean) {
  try {
    if (active) window.sessionStorage.setItem(recoveryStorageKey, 'true')
    else window.sessionStorage.removeItem(recoveryStorageKey)
  } catch {
    // Auth remains functional when storage is unavailable.
  }
}

export function AuthProvider({
  children,
  onSignedOut,
}: {
  children: ReactNode
  onSignedOut?: () => void
}) {
  const [state, setState] = useState<AuthState>(() => ({
    ...initialState,
    isPasswordRecovery: storedRecoveryState(),
  }))
  const syncVersion = useRef(0)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    const client = getSupabaseBrowserClient()
    let active = true

    async function syncSession(session: Session | null) {
      const version = ++syncVersion.current

      if (!session) {
        if (active) {
          setState((current) => ({
            ...current,
            status: 'anonymous',
            session: null,
            user: null,
            profile: null,
            profileError: false,
          }))
        }
        return
      }

      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!active || version !== syncVersion.current) return

      if (error && import.meta.env.DEV) {
        console.error('Unable to load the authenticated profile', {
          code: error.code,
        })
      }

      setState((current) => ({
        ...current,
        status: 'authenticated',
        session,
        user: session.user,
        profile: profile ?? null,
        profileError: Boolean(error) || !profile,
      }))
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        storeRecoveryState(true)
        setState((current) => ({ ...current, isPasswordRecovery: true }))
      } else if (event === 'SIGNED_OUT') {
        storeRecoveryState(false)
        onSignedOut?.()
        setState((current) => ({ ...current, isPasswordRecovery: false }))
      }

      window.setTimeout(() => void syncSession(session), 0)
    })

    return () => {
      active = false
      syncVersion.current += 1
      subscription.unsubscribe()
    }
  }, [onSignedOut])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const { error } = await getSupabaseBrowserClient().auth.signOut()
    if (error) throw new Error('We could not sign you out. Please try again.')
  }, [])

  const completePasswordRecovery = useCallback(() => {
    storeRecoveryState(false)
    setState((current) => ({ ...current, isPasswordRecovery: false }))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signOut, completePasswordRecovery }),
    [completePasswordRecovery, signOut, state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
