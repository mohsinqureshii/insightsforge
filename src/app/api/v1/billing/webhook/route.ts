import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/billing/stripe'
import { prisma } from '@/lib/prisma'
import type Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLAN_BY_PRICE: Record<string, 'starter' | 'business' | 'enterprise'> = {
  [process.env.STRIPE_PRICE_STARTER ?? '']: 'starter',
  [process.env.STRIPE_PRICE_BUSINESS ?? '']: 'business',
  [process.env.STRIPE_PRICE_ENTERPRISE ?? '']: 'enterprise',
}

async function getPlanFromSubscription(
  subscription: Stripe.Subscription,
): Promise<'starter' | 'business' | 'enterprise'> {
  const priceId = subscription.items.data[0]?.price.id ?? ''
  return PLAN_BY_PRICE[priceId] ?? 'starter'
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed'
    console.error('[billing/webhook] signature error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const plan = await getPlanFromSubscription(subscription)

        await prisma.tenant.updateMany({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            plan,
            stripeSubscriptionId: subscription.id,
            status: subscription.status === 'active' ? 'active' : 'trial',
          },
        })

        await prisma.ifAuditLog.create({
          data: {
            action: 'plan_changed',
            metadata: {
              event: event.type,
              subscriptionId: subscription.id,
              plan,
              status: subscription.status,
            },
          },
        }).catch(() => null)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await prisma.tenant.updateMany({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            plan: 'starter',
            stripeSubscriptionId: null,
            status: 'active',
          },
        })

        await prisma.ifAuditLog.create({
          data: {
            action: 'plan_changed',
            metadata: {
              event: event.type,
              subscriptionId: subscription.id,
              plan: 'starter',
              reason: 'subscription_deleted',
            },
          },
        }).catch(() => null)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id

        if (subscriptionId) {
          // Extend trial if applicable — clear trialEndsAt when first real payment succeeds
          await prisma.tenant.updateMany({
            where: {
              stripeCustomerId: invoice.customer as string,
              trialEndsAt: { not: null },
            },
            data: { trialEndsAt: null, status: 'active' },
          })
        }

        await prisma.ifAuditLog.create({
          data: {
            action: 'plan_changed',
            metadata: {
              event: event.type,
              invoiceId: invoice.id,
              amountPaid: invoice.amount_paid,
              currency: invoice.currency,
            },
          },
        }).catch(() => null)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        // Find tenant by stripe customer id
        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustomerId: invoice.customer as string, deletedAt: null },
          select: { id: true, name: true },
        })

        if (tenant) {
          // Log the payment failure — in-app notification would be handled by notification service
          await prisma.ifAuditLog.create({
            data: {
              tenantId: tenant.id,
              action: 'plan_changed',
              metadata: {
                event: event.type,
                invoiceId: invoice.id,
                amountDue: invoice.amount_due,
                currency: invoice.currency,
                gracePeriodDays: 7,
              },
            },
          }).catch(() => null)
        }
        break
      }

      default:
        // Unhandled event type — not an error
        break
    }
  } catch (err) {
    console.error('[billing/webhook] handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
