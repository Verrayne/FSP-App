import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/hooks/useAuth'
import { useOptionalFsp } from '../onboarding/hooks/useFsp'
import { useOptionalTenant } from '../tenant/hooks/useTenant'
import { markNotificationRead, notificationQueryKeys } from './notificationService'
import type { UserNotification } from './types'

export function useNotificationAction() {
  const { user } = useAuth()
  const fsp = useOptionalFsp()
  const tenant = useOptionalTenant()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return async (notification: UserNotification) => {
    const destination = await markNotificationRead(notification.id)
    if (
      destination.fsp_id &&
      destination.action_path?.startsWith('/app') &&
      !fsp?.selectFsp(destination.fsp_id)
    ) {
      void navigate('/forbidden')
      return
    }
    if (destination.tenant_id && destination.action_path?.startsWith('/admin')) {
      if (!tenant?.selectTenant(destination.tenant_id)) {
        void navigate('/forbidden')
        return
      }
    }
    if (user) await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.root(user.id) })
    void navigate(destination.action_path ?? (destination.tenant_id ? '/admin/dashboard' : '/app'))
  }
}
