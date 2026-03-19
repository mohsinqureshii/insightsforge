import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import type { ApiResponse } from '@/types/insightsforge'

interface ServiceStatus {
  status: 'up' | 'down'
  latencyMs?: number
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  timestamp: string
  uptimeSeconds: number
  services: {
    database: ServiceStatus
    redis: ServiceStatus
  }
}

async function checkDatabase(): Promise<ServiceStatus> {
  const t0 = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'up', latencyMs: Date.now() - t0 }
  } catch {
    return { status: 'down' }
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const t0 = Date.now()
  try {
    await redis.ping()
    return { status: 'up', latencyMs: Date.now() - t0 }
  } catch {
    return { status: 'down' }
  }
}

export async function GET(): Promise<NextResponse<ApiResponse<HealthStatus>>> {
  const [database, redisService] = await Promise.all([checkDatabase(), checkRedis()])

  const allUp = database.status === 'up' && redisService.status === 'up'
  const anyUp = database.status === 'up' || redisService.status === 'up'

  const overallStatus: HealthStatus['status'] = allUp
    ? 'healthy'
    : anyUp
      ? 'degraded'
      : 'unhealthy'

  const healthData: HealthStatus = {
    status: overallStatus,
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database,
      redis: redisService,
    },
  }

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503

  return NextResponse.json({ success: allUp, data: healthData }, { status: httpStatus })
}
