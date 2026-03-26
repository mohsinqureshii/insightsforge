import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { SYSTEM_REPORTS } from '../src/lib/system-content/reports'
import { DASHBOARD_TEMPLATES } from '../src/lib/system-content/dashboards'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // ── Super admin user ──────────────────────────────────────────
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

  // ── Demo tenant ───────────────────────────────────────────────
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'InsightForge Demo',
      plan: 'business',
    },
    create: {
      name: 'InsightForge Demo',
      slug: 'demo',
      plan: 'business',
      status: 'active',
      maxUsers: 20,
      maxSources: 10,
      maxReports: 200,
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

  // ── Demo admin user ───────────────────────────────────────────
  const demoAdminPasswordHash = await hash('Demo@123456', 12)

  const demoAdminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.insightforge.io' },
    update: {},
    create: {
      name: 'Demo Admin',
      email: 'admin@demo.insightforge.io',
      passwordHash: demoAdminPasswordHash,
      isActive: true,
      emailVerified: new Date(),
    },
  })

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: demoAdminUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoAdminUser.id,
      role: 'tenant_admin',
      inviteStatus: 'accepted',
      joinedAt: new Date(),
    },
  })

  console.log(`✅ Demo admin user created: ${demoAdminUser.email}`)

  // Ensure legacy admin user is also linked to demo tenant
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
      role: 'super_admin',
      inviteStatus: 'accepted',
      joinedAt: new Date(),
    },
  })

  // ── Demo viewer user ──────────────────────────────────────────
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

  // ── System reports ────────────────────────────────────────────
  console.log('⏳ Seeding system reports...')

  for (const report of SYSTEM_REPORTS) {
    const reportConfig = {
      ...(report.definition as unknown as Record<string, unknown>),
      category: report.category,
      isSystemReport: true,
    }
    await prisma.ifReport.upsert({
      where: {
        id: report.id,
      },
      update: {
        name: report.name,
        description: report.description,
        config: reportConfig,
      },
      create: {
        id: report.id,
        tenantId: demoTenant.id,
        name: report.name,
        description: report.description,
        type: 'chart',
        config: reportConfig,
        visibility: 'tenant',
        isFeatured: true,
        createdBy: demoAdminUser.id,
      },
    })
  }

  console.log(`✅ ${SYSTEM_REPORTS.length} system reports seeded`)

  // ── Dashboard templates ───────────────────────────────────────
  console.log('⏳ Seeding dashboard templates...')

  for (const template of DASHBOARD_TEMPLATES) {
    await prisma.ifDashboard.upsert({
      where: {
        id: template.id,
      },
      update: {
        name: template.name,
        description: template.description,
        config: {
          ...(template.layout.config as Record<string, unknown>),
          category: template.category,
          isDashboardTemplate: true,
          thumbnail: template.thumbnail,
        },
        layout: template.layout.widgets as unknown as never[],
      },
      create: {
        id: template.id,
        tenantId: demoTenant.id,
        name: template.name,
        description: template.description,
        config: {
          ...(template.layout.config as Record<string, unknown>),
          category: template.category,
          isDashboardTemplate: true,
          thumbnail: template.thumbnail,
        },
        layout: template.layout.widgets as unknown as never[],
        visibility: 'tenant',
        isFeatured: true,
        createdBy: demoAdminUser.id,
      },
    })
  }

  console.log(`✅ ${DASHBOARD_TEMPLATES.length} dashboard templates seeded`)

  // ── Sample folder ─────────────────────────────────────────────
  // Use findFirst + create to avoid duplicates since there's no unique key
  const existingFolder = await prisma.ifFolder.findFirst({
    where: { tenantId: demoTenant.id, name: 'Marketing Analytics' },
  })

  if (!existingFolder) {
    await prisma.ifFolder.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Marketing Analytics',
        description: 'Reports and dashboards for marketing team',
        createdBy: adminUser.id,
      },
    })
  }

  // ── Sample audit log entries ──────────────────────────────────
  await prisma.ifAuditLog.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        userId: adminUser.id,
        action: 'tenant_created',
        metadata: { orgName: 'InsightForge Demo', orgSlug: 'demo' },
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
  console.log('  Admin:       admin@insightsforge.io / Admin123!')
  console.log('  Demo Admin:  admin@demo.insightforge.io / Demo@123456')
  console.log('  Viewer:      viewer@demo.com / Viewer123!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
