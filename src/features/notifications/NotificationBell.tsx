import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Dropdown, Skeleton } from '../../components/ui'
import { buttonVariants } from '../../components/ui/buttonVariants'
import { cn } from '../../lib/utils/cn'
import { useAuth } from '../auth/hooks/useAuth'
import { listNotifications, notificationQueryKeys, getUnreadCount } from './notificationService'
import { useNotificationAction } from './useNotificationAction'

export function NotificationBell({
  workspace,
  basePath,
}: {
  workspace: 'fsp' | 'tenant'
  basePath?: string
}) {
  const { user } = useAuth()
  const openNotification = useNotificationAction()
  const base = basePath ?? (workspace === 'tenant' ? '/admin/notifications' : '/app/notifications')
  const userId = user?.id ?? ''
  const unread = useQuery({
    queryKey: notificationQueryKeys.unread(userId),
    queryFn: getUnreadCount,
    enabled: Boolean(user),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  const recent = useQuery({
    queryKey: notificationQueryKeys.recent(userId),
    queryFn: () => listNotifications(1, 8),
    enabled: Boolean(user),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  const count = unread.data ?? 0

  return (
    <Dropdown
      labelText={count ? `Notifications, ${count} unread` : 'Notifications'}
      label={
        <span className={cn(buttonVariants({ variant: 'ghost' }), 'relative px-2')}>
          <Bell className="size-4" aria-hidden="true" />
          {count > 0 && (
            <span className="bg-brand-700 absolute -top-1 -right-1 min-w-5 rounded-full px-1 text-center text-[11px] leading-5 font-semibold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
      }
    >
      <div className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 && <span className="text-xs font-medium text-slate-600">{count} unread</span>}
        </div>
        <div className="max-h-96 overflow-y-auto py-1">
          {recent.isPending ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : recent.isError ? (
            <p role="alert" className="p-3 text-sm text-red-700">
              Unable to load notifications.
            </p>
          ) : recent.data?.length ? (
            recent.data.map((item) => (
              <button
                key={item.id}
                className={cn(
                  'w-full border-b px-3 py-2 text-left text-sm hover:bg-slate-50',
                  !item.readDate && 'bg-blue-50/60',
                )}
                onClick={() => void openNotification(item)}
              >
                <span className="flex items-center gap-2 font-medium">
                  {!item.readDate && (
                    <span
                      className="size-2 shrink-0 rounded-full bg-blue-700"
                      aria-label="Unread"
                    />
                  )}
                  {item.title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">
                  {item.body}
                </span>
              </button>
            ))
          ) : (
            <p className="p-5 text-center text-sm text-slate-500">No notifications yet.</p>
          )}
        </div>
        <div className="border-t p-1">
          <Link className={buttonVariants({ variant: 'ghost', className: 'w-full' })} to={base}>
            View all notifications
          </Link>
        </div>
      </div>
    </Dropdown>
  )
}
