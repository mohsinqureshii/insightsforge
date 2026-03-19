import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/billing/stripe'
import type { ApiResponse } from '@/types/insightsforge'

type PortalData = { url: string }

// POST /api/v1/billing/portal — Create Stripe Customer Portal session
export async function POST(
  _req: NextRequest,
): Promise<NextResponse<ApiResponse<PortalData>>> {
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

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId, deletedAt: null },
      select: { stripeCustomerId: true, name: true },
    })

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    if (!tenant.stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: 'No billing account found. Please upgrade your plan first.' },
        { status: 400 },
      )
    }

    const returnUrl = `${process.env.NEXTAUTH_URL}/settings/billing`

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ success: true, data: { url: portalSession.url } })
  } catch (err) {
    console.error('[billing/portal] error', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create billing portal session' },
      { status: 500 },
    )
  }
}
