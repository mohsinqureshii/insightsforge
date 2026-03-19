import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/billing/stripe'
import { z } from 'zod'
import type { ApiResponse } from '@/types/insightsforge'

type CheckoutData = { url: string }

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'business', 'enterprise']),
})

const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  business: process.env.STRIPE_PRICE_BUSINESS,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
}

// POST /api/v1/billing/checkout — Create Stripe Checkout session
export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<CheckoutData>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  if (session.activeRole !== 'tenant_admin' && session.activeRole !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 422 },
    )
  }

  const { plan } = parsed.data
  const priceId = PRICE_IDS[plan]

  if (!priceId) {
    return NextResponse.json(
      { success: false, error: `No price configured for plan: ${plan}` },
      { status: 400 },
    )
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId, deletedAt: null },
      select: { stripeCustomerId: true, name: true },
    })

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(tenant.stripeCustomerId ? { customer: tenant.stripeCustomerId } : {}),
      customer_email: tenant.stripeCustomerId ? undefined : session.user.email,
      metadata: { tenantId, plan },
      success_url: `${baseUrl}/settings/billing?checkout=success`,
      cancel_url: `${baseUrl}/settings/billing?checkout=cancelled`,
    })

    if (!checkoutSession.url) {
      throw new Error('Stripe did not return a checkout URL')
    }

    return NextResponse.json({ success: true, data: { url: checkoutSession.url } })
  } catch (err) {
    console.error('[billing/checkout] error', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
