import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTenantRole } from '@/lib/tenant'
import { hasPermission } from '@/lib/rbac'
import type { Role } from '@/types/insightsforge'
import { TeamManagement } from '@/components/auth/TeamManagement'

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const tenantId = session.activeTenantId
  if (!tenantId) redirect('/dashboard')

  const role = await getUserTenantRole(session.user.id, tenantId)
  if (!role || !hasPermission(role as Role, 'USER_READ')) {
    redirect('/dashboard')
  }

  const members = await prisma.tenantUser.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          lastLoginAt: true,
          mfaEnabled: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const canManage = hasPermission(role as Role, 'USER_INVITE')

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage team members and their roles in your organization.
        </p>
      </div>

      <TeamManagement
        members={members as unknown as Parameters<typeof TeamManagement>[0]['members']}
        currentUserId={session.user.id}
        currentRole={role as Role}
        canManage={canManage}
        tenantId={tenantId}
      />
    </div>
  )
}
