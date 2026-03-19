/**
 * Notification dispatcher.
 * Creates in-app notification records and fans out to email / Slack
 * for alert firings and system events.
 */

import { prisma } from '@/lib/prisma'
import type { NotificationChannel } from '@prisma/client'

export interface DispatchPayload {
  tenantId: string
  userId: string
  alertRuleId?: string
  title: string
  body: string
  link?: string
  channels: NotificationChannel[]
  metadata?: Record<string, unknown>
  /** Optional Slack webhook URL (overrides tenant default) */
  slackWebhook?: string
}

export async function dispatchNotification(payload: DispatchPayload): Promise<void> {
  const { tenantId, userId, alertRuleId, title, body, link, channels, metadata, slackWebhook } =
    payload

  // Always create an in-app notification
  await prisma.ifNotification.create({
    data: {
      tenantId,
      userId,
      alertRuleId: alertRuleId ?? null,
      channel: 'in_app',
      title,
      body,
      link: link ?? null,
      metadata: (metadata ?? {}) as object,
    },
  })

  // Fan out to external channels (fire-and-forget; errors are non-fatal)
  const externalChannels = channels.filter((c) => c !== 'in_app')
  if (externalChannels.length === 0) return

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })

  await Promise.allSettled([
    externalChannels.includes('email') && user?.email
      ? sendEmailNotification({ to: user.email, title, body, link })
      : Promise.resolve(),
    externalChannels.includes('slack') && slackWebhook
      ? sendSlackNotification({ webhookUrl: slackWebhook, title, body, link })
      : Promise.resolve(),
  ])
}

// ---------------------------------------------------------------------------
// Email channel (delegates to existing email infrastructure)
// ---------------------------------------------------------------------------

async function sendEmailNotification(opts: {
  to: string
  title: string
  body: string
  link?: string
}): Promise<void> {
  // In production, replace with `src/lib/email` transport
  if (process.env.NODE_ENV === 'development') {
    console.log('[Notify:email]', opts.to, opts.title)
  }
  // TODO: integrate with lib/email sendMail when SMTP is configured
}

// ---------------------------------------------------------------------------
// Slack channel
// ---------------------------------------------------------------------------

async function sendSlackNotification(opts: {
  webhookUrl: string
  title: string
  body: string
  link?: string
}): Promise<void> {
  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${opts.title}*\n${opts.body}` } },
    ...(opts.link
      ? [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View' },
                url: opts.link,
              },
            ],
          },
        ]
      : []),
  ]

  const response = await fetch(opts.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  })

  if (!response.ok) {
    console.error('[Notify:slack] Webhook failed', response.status)
  }
}
