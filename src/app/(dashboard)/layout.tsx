import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const tenantId = session.activeTenantId

  let tenantName: string | undefined
  let tenantSlug: string | undefined

  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    })
    tenantName = tenant?.name
    tenantSlug = tenant?.slug
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} tenantSlug={tenantSlug} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={session.user.name}
          userEmail={session.user.email}
          userImage={session.user.image}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
