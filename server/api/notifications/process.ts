import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'

import { createSupabaseServerClient } from '../../../src/lib/supabase/server.js'
import { isAuthorizedCron } from '../_lib/cronAuth.js'
import { createEmailProvider, escapeHtml } from '../_lib/emailProvider.js'
import { getTrustedAppUrl } from '../_lib/serverConfig.js'

function errorCode(error: unknown) {
  return (error instanceof Error ? error.message : 'UNKNOWN_ERROR')
    .replace(/[^A-Z0-9_]/gi, '_')
    .toUpperCase()
    .slice(0, 100)
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST' && request.method !== 'GET')
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  if (!isAuthorizedCron(request)) return response.status(401).json({ error: 'UNAUTHORIZED' })
  const client = createSupabaseServerClient()
  const worker = `notification-${randomUUID()}`
  const counts = { events: 0, notifications: 0, sent: 0, failed: 0 }

  const events = await client.rpc('claim_notification_events', {
    target_worker_id: worker,
    target_batch_size: 40,
  })
  if (events.error) return response.status(500).json({ error: 'EVENT_CLAIM_FAILED' })
  for (const event of events.data) {
    const result = await client.rpc('materialize_notification_event', {
      target_event_id: event.event_id,
      target_worker_id: worker,
    })
    if (result.error) {
      counts.failed += 1
      await client.rpc('fail_notification_event', {
        target_event_id: event.event_id,
        target_worker_id: worker,
        target_error_code: errorCode(result.error.code),
      })
    } else {
      counts.events += 1
      counts.notifications += Number(result.data)
    }
  }

  const deliveries = await client.rpc('claim_notification_deliveries', {
    target_worker_id: worker,
    target_batch_size: 40,
  })
  if (deliveries.error)
    return response.status(500).json({ error: 'DELIVERY_CLAIM_FAILED', ...counts })
  const provider = createEmailProvider()
  const origin = getTrustedAppUrl()
  for (const delivery of deliveries.data) {
    try {
      const contextResult = await client.rpc('get_notification_delivery_context', {
        target_delivery_id: delivery.delivery_id,
        target_worker_id: worker,
      })
      const context = contextResult.data?.[0]
      if (contextResult.error) throw new Error(contextResult.error.code)
      if (!context) continue
      const url = context.action_path ? new URL(context.action_path, origin).toString() : origin
      const result = await provider.send({
        to: context.recipient_address,
        subject: context.title,
        text: `${context.body}\n\nOpen FSP: ${url}`,
        html: `<p>${escapeHtml(context.body)}</p><p><a href="${escapeHtml(url)}">Open FSP</a></p>`,
        idempotencyKey: `notification-${delivery.delivery_id}`,
      })
      if (result.accepted) {
        await client.rpc('complete_notification_delivery', {
          target_delivery_id: delivery.delivery_id,
          target_worker_id: worker,
          target_provider: result.provider,
          target_provider_message_id: result.messageId,
        })
        counts.sent += 1
      } else {
        await client.rpc('fail_notification_delivery', {
          target_delivery_id: delivery.delivery_id,
          target_worker_id: worker,
          target_error_code: result.errorCode,
          target_permanent: result.permanent,
        })
        counts.failed += 1
      }
    } catch (error) {
      await client.rpc('fail_notification_delivery', {
        target_delivery_id: delivery.delivery_id,
        target_worker_id: worker,
        target_error_code: errorCode(error),
        target_permanent: false,
      })
      counts.failed += 1
    }
  }
  return response.status(200).json({ status: counts.failed ? 'PARTIAL' : 'COMPLETED', ...counts })
}
