import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import type { ApiResponse } from '@/types/insightsforge'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  timestamp: string
  services: {
    database: 'up' | 'down'
    redis: 'up' | 'down'
  }
  uptime: number
}

export async function GET(): Promise<NextResponse<ApiResponse<HealthStatus>>> {
  const startTime = Date.now()

  let dbStatus: 'up' | 'down' = 'down'
  let redisStatus: 'up' | 'down' = 'down'

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'up'
  } catch {
    dbStatus = 'down'
  }

  try {
    await redis.ping()
    redisStatus = 'up'
  } catch {
    redisStatus = 'down'
  }

  const isHealthy = dbStatus === 'up' && redisStatus === 'up'
  const isDegraded = dbStatus === 'up' || redisStatus === 'up'

  const healthData: HealthStatus = {
    status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
    uptime: process.uptime(),
  }

  const httpStatus = isHealthy ? 200 : isDegraded ? 207 : 503

  return NextResponse.json(
    { success: isHealthy, data: healthData },
    { status: httpStatus },
  )
}
