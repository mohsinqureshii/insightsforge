import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create super admin user
  const adminPasswordHash = await hash('Admin123!', 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@insightsforge.io' },
    update: {},
    create: {
      name: 'InsightForge Admin',
      email: 'admin@insightsforge.io',
      passwordHash: adminPasswordHash,
      isActive: true,
      emailVerified: new Date(),
    },
  })

  console.log(`✅ Admin user created: ${adminUser.email}`)

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo',
      plan: 'business',
      status: 'active',
      maxUsers: 20,
      maxSources: 10,
      maxReports: 100,
      settings: {
        timezone: 'UTC',
        locale: 'en-US',
        dateFormat: 'MMM d, yyyy',
        theme: 'system',
        primaryColor: '#7c3aed',
        allowPublicDashboards: true,
        requireMfa: false,
        allowedDomains: [],
        dataRetentionDays: 365,
      },
    },
  })

  console.log(`✅ Demo tenant created: ${demoTenant.slug}`)

  // Create tenant-admin membership
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: adminUser.id,
      role: 'tenant_admin',
      inviteStatus: 'accepted',
      joinedAt: new Date(),
    },
  })

  // Create sample viewer user
  const viewerPasswordHash = await hash('Viewer123!', 12)
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@demo.com' },
    update: {},
    create: {
      name: 'Demo Viewer',
      email: 'viewer@demo.com',
      passwordHash: viewerPasswordHash,
      isActive: true,
      emailVerified: new Date(),
    },
  })

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: viewerUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: viewerUser.id,
      role: 'viewer',
      inviteStatus: 'accepted',
      joinedAt: new Date(),
    },
  })

  console.log(`✅ Demo viewer created: ${viewerUser.email}`)

  // Create a sample folder
  const rootFolder = await prisma.ifFolder.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Marketing Analytics',
      description: 'Reports and dashboards for marketing team',
      createdBy: adminUser.id,
    },
  })

  // Create sample audit log entries
  await prisma.ifAuditLog.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        userId: adminUser.id,
        action: 'tenant_created',
        metadata: { orgName: 'Demo Organization', orgSlug: 'demo' },
      },
      {
        tenantId: demoTenant.id,
        userId: adminUser.id,
        action: 'login',
        metadata: { email: adminUser.email },
      },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Sample data created')
  console.log('')
  console.log('🎉 Seed complete!')
  console.log('')
  console.log('Demo credentials:')
  console.log('  Admin:  admin@insightsforge.io / Admin123!')
  console.log('  Viewer: viewer@demo.com / Viewer123!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
