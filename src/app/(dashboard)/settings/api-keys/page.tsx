import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTenantRole } from '@/lib/tenant'
import { hasPermission } from '@/lib/rbac'
import type { Role } from '@/types/insightsforge'
import { ApiKeysManager } from '@/components/auth/ApiKeysManager'

export default async function ApiKeysPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const tenantId = session.activeTenantId
  if (!tenantId) redirect('/dashboard')

  const role = await getUserTenantRole(session.user.id, tenantId)
  if (!role || !hasPermission(role as Role, 'API_KEY_READ')) {
    redirect('/dashboard')
  }

  const apiKeys = await prisma.ifApiKey.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const canRevoke = hasPermission(role as Role, 'API_KEY_REVOKE')
  const canCreate = hasPermission(role as Role, 'API_KEY_CREATE')

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage API keys for programmatic access to InsightForge.
        </p>
      </div>

      <ApiKeysManager
        apiKeys={apiKeys as unknown as Parameters<typeof ApiKeysManager>[0]['apiKeys']}
        canCreate={canCreate}
        canRevoke={canRevoke}
      />
    </div>
  )
}
