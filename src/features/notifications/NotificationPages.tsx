import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Alert,
  Button,
  Card,
  Checkbox,
  EmptyState,
  PageHeader,
  Skeleton,
} from '../../components/ui'
import { buttonVariants } from '../../components/ui/buttonVariants'
import { formatTimestamp } from '../dashboard/lib/dashboardPresentation'
import { useAuth } from '../auth/hooks/useAuth'
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  notificationQueryKeys,
  setNotificationPreference,
} from './notificationService'
import type { NotificationCategory } from './types'
import { useNotificationAction } from './useNotificationAction'

const labels: Record<NotificationCategory, { title: string; detail: string }> = {
  SUBMISSION_UPDATES: {
    title: 'Submission updates',
    detail: 'Submission starts, sends and period openings.',
  },
  SUBMISSION_REMINDERS: { title: 'Submission reminders', detail: 'Upcoming reporting deadlines.' },
  REVIEW_ASSIGNMENTS: {
    title: 'Review assignments',
    detail: 'Submissions that require your review.',
  },
  REVIEW_OUTCOMES: {
    title: 'Review outcomes',
    detail: 'Completed and rejected submission reviews.',
  },
}

export function NotificationsPage({
  workspace,
  settingsPath: configuredSettingsPath,
}: {
  workspace: 'fsp' | 'tenant'
  settingsPath?: string
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const openNotification = useNotificationAction()
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: notificationQueryKeys.list(userId, page, unreadOnly),
    queryFn: () => listNotifications(page, 25, unreadOnly),
    enabled: Boolean(user),
    refetchOnWindowFocus: true,
  })
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.root(userId) }),
  })
  const total = query.data?.[0]?.totalCount ?? 0
  const pages = Math.max(1, Math.ceil(total / 25))
  const settingsPath =
    configuredSettingsPath ??
    (workspace === 'tenant' ? '/admin/notifications/settings' : '/app/notifications/settings')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        action={
          <Link to={settingsPath} className={buttonVariants({ variant: 'secondary' })}>
            <Settings className="size-4" />
            Preferences
          </Link>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked)
              setPage(1)
            }}
          />
          Unread only
        </label>
        <Button
          variant="secondary"
          disabled={markAll.isPending || total === 0}
          onClick={() => markAll.mutate()}
        >
          Mark all as read
        </Button>
      </div>
      {markAll.isError && <Alert title="Notifications could not be updated" variant="danger" />}
      {query.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : query.isError ? (
        <Alert title="Notifications could not be loaded" variant="danger" />
      ) : query.data.length === 0 ? (
        <EmptyState
          title={unreadOnly ? 'You are all caught up' : 'No notifications yet'}
          description={
            unreadOnly
              ? 'There are no unread notifications.'
              : 'Updates about submissions and account activity will appear here.'
          }
        />
      ) : (
        <div className="space-y-2">
          {query.data.map((item) => (
            <Card key={item.id} className={!item.readDate ? 'border-blue-200 bg-blue-50/30' : ''}>
              <button className="w-full p-4 text-left" onClick={() => void openNotification(item)}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      {!item.readDate && (
                        <span className="size-2 rounded-full bg-blue-700" aria-label="Unread" />
                      )}
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                  </div>
                  {item.priority === 'HIGH' && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      Important
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatTimestamp(item.createDate)}</p>
              </button>
            </Card>
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Notification pages" className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page === pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}
    </div>
  )
}

export function NotificationPreferencesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: notificationQueryKeys.preferences(userId),
    queryFn: getNotificationPreferences,
    enabled: Boolean(user),
  })
  const mutation = useMutation({
    mutationFn: ({ category, enabled }: { category: NotificationCategory; enabled: boolean }) =>
      setNotificationPreference(category, enabled),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.preferences(userId) }),
  })
  return (
    <div className="space-y-6">
      <PageHeader title="Notification preferences" />
      <Card className="divide-y">
        <div className="p-4">
          <p className="font-semibold">Account and security</p>
          <p className="text-sm text-slate-600">
            Required account messages and important claim outcomes.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox checked disabled />
            Email enabled (required)
          </label>
        </div>
        {query.isPending ? (
          <div className="p-4">
            <Skeleton className="h-20" />
          </div>
        ) : query.isError ? (
          <div className="p-4">
            <Alert title="Preferences could not be loaded" variant="danger" />
          </div>
        ) : (
          query.data.map((preference) => (
            <div key={preference.category} className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{labels[preference.category].title}</p>
                <p className="text-sm text-slate-600">{labels[preference.category].detail}</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <Checkbox
                  checked={preference.emailEnabled}
                  disabled={mutation.isPending}
                  onChange={(event) =>
                    mutation.mutate({
                      category: preference.category,
                      enabled: event.target.checked,
                    })
                  }
                />
                Email
              </label>
            </div>
          ))
        )}
      </Card>
      {mutation.isError && <Alert title="Preference could not be saved" variant="danger" />}
    </div>
  )
}
