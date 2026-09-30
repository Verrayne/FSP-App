import { getSupabaseBrowserClient } from '../../lib/supabase/client'
import type { NotificationCategory, NotificationPreference, UserNotification } from './types'

export const notificationQueryKeys = {
  root: (userId: string) => ['notifications', userId] as const,
  list: (userId: string, page: number, unreadOnly: boolean) =>
    [...notificationQueryKeys.root(userId), 'list', page, unreadOnly] as const,
  recent: (userId: string) => [...notificationQueryKeys.root(userId), 'recent'] as const,
  unread: (userId: string) => [...notificationQueryKeys.root(userId), 'unread'] as const,
  preferences: (userId: string) => [...notificationQueryKeys.root(userId), 'preferences'] as const,
}

export async function listNotifications(page = 1, pageSize = 25, unreadOnly = false) {
  const { data, error } = await getSupabaseBrowserClient().rpc('list_my_notifications', {
    page_number: page,
    page_size: pageSize,
    unread_only: unreadOnly,
  })
  if (error) throw new Error('Notifications could not be loaded.')
  return data.map((row): UserNotification => ({
    id: row.notification_id,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    actionPath: row.action_path,
    category: row.category,
    priority: row.priority as 'NORMAL' | 'HIGH',
    tenantId: row.tenant_id,
    fspId: row.fsp_id,
    submissionId: row.submission_id,
    readDate: row.read_date,
    createDate: row.create_date,
    totalCount: Number(row.total_count),
  }))
}

export async function getUnreadCount() {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_my_notification_unread_count')
  if (error) throw new Error('Unread notifications could not be loaded.')
  return Number(data)
}

export async function markNotificationRead(notificationId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc('mark_notification_read', {
    target_notification_id: notificationId,
  })
  if (error || !data[0]) throw new Error('Notification could not be opened.')
  return data[0]
}

export async function markAllNotificationsRead() {
  const { data, error } = await getSupabaseBrowserClient().rpc('mark_all_notifications_read')
  if (error) throw new Error('Notifications could not be updated.')
  return Number(data)
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('get_my_notification_preferences')
  if (error) throw new Error('Notification preferences could not be loaded.')
  return data.map((row) => ({
    category: row.category as NotificationCategory,
    emailEnabled: row.email_enabled,
  }))
}

export async function setNotificationPreference(
  category: NotificationCategory,
  emailEnabled: boolean,
) {
  const { error } = await getSupabaseBrowserClient().rpc('set_my_notification_preference', {
    target_category: category,
    target_email_enabled: emailEnabled,
  })
  if (error) throw new Error('Notification preference could not be saved.')
}
