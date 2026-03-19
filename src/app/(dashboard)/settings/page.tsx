import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTenantRole } from '@/lib/tenant'
import { hasPermission } from '@/lib/rbac'
import type { Role } from '@/types/insightsforge'
import { SettingsForm } from '@/components/auth/SettingsForm'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const tenantId = session.activeTenantId
  if (!tenantId) redirect('/dashboard')

  const role = await getUserTenantRole(session.user.id, tenantId)
  if (!role || !hasPermission(role as Role, 'SETTINGS_READ')) {
    redirect('/dashboard')
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  })

  if (!tenant) redirect('/dashboard')

  const canEdit = hasPermission(role as Role, 'SETTINGS_UPDATE')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization&apos;s name, plan, and preferences.
        </p>
      </div>

      <SettingsForm
        tenant={{
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          settings: tenant.settings as Record<string, unknown>,
        }}
        canEdit={canEdit}
      />
    </div>
  )
}
