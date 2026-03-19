/**
 * Lightweight Prometheus-compatible metrics collector.
 *
 * Metrics are stored in Redis so they survive process restarts and
 * work across multiple Next.js instances.
 *
 * Supported metric types: counter, gauge.
 * Histograms are approximated via Redis sorted sets (p50/p95/p99).
 */

import { redis } from '@/lib/redis'

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

const PREFIX = 'metrics:'

function counterKey(name: string): string {
  return `${PREFIX}counter:${name}`
}

function gaugeKey(name: string): string {
  return `${PREFIX}gauge:${name}`
}

function histKey(name: string): string {
  return `${PREFIX}hist:${name}`
}

// ---------------------------------------------------------------------------
// Counter
// ---------------------------------------------------------------------------

/** Increment a counter by `by` (default 1). */
export async function incCounter(name: string, by = 1): Promise<void> {
  try {
    await redis.incrbyfloat(counterKey(name), by)
  } catch {
    // Non-fatal
  }
}

/** Read current counter value. */
export async function getCounter(name: string): Promise<number> {
  try {
    const val = await redis.get(counterKey(name))
    return val ? parseFloat(val) : 0
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Gauge
// ---------------------------------------------------------------------------

/** Set a gauge to an absolute value. */
export async function setGauge(name: string, value: number): Promise<void> {
  try {
    await redis.set(gaugeKey(name), value)
  } catch {
    // Non-fatal
  }
}

/** Read current gauge value. */
export async function getGauge(name: string): Promise<number> {
  try {
    const val = await redis.get(gaugeKey(name))
    return val ? parseFloat(val) : 0
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Histogram (approximate via sorted set)
// ---------------------------------------------------------------------------

const HIST_MAX_SAMPLES = 10_000

/** Record a duration/value sample for histogram percentiles. */
export async function recordHistogram(name: string, value: number): Promise<void> {
  try {
    const key = histKey(name)
    const member = `${Date.now()}-${Math.random()}`
    await redis.zadd(key, value, member)
    // Keep sorted set bounded
    const count = await redis.zcard(key)
    if (count > HIST_MAX_SAMPLES) {
      await redis.zremrangebyrank(key, 0, count - HIST_MAX_SAMPLES - 1)
    }
  } catch {
    // Non-fatal
  }
}

/** Compute approximate percentiles from a histogram sorted set. */
export async function getHistogramPercentiles(
  name: string,
): Promise<{ p50: number; p95: number; p99: number; count: number } | null> {
  try {
    const key = histKey(name)
    const count = await redis.zcard(key)
    if (count === 0) return null

    const p50idx = Math.floor(count * 0.5)
    const p95idx = Math.floor(count * 0.95)
    const p99idx = Math.floor(count * 0.99)

    const [p50r, p95r, p99r] = await Promise.all([
      redis.zrange(key, p50idx, p50idx, 'WITHSCORES'),
      redis.zrange(key, p95idx, p95idx, 'WITHSCORES'),
      redis.zrange(key, p99idx, p99idx, 'WITHSCORES'),
    ])

    return {
      p50: p50r[1] ? parseFloat(p50r[1]) : 0,
      p95: p95r[1] ? parseFloat(p95r[1]) : 0,
      p99: p99r[1] ? parseFloat(p99r[1]) : 0,
      count,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Snapshot – collect all known metrics for the /metrics endpoint
// ---------------------------------------------------------------------------

export interface MetricsSnapshot {
  counters: Record<string, number>
  gauges: Record<string, number>
  histograms: Record<string, { p50: number; p95: number; p99: number; count: number }>
  collectedAt: string
}

export async function collectMetrics(): Promise<MetricsSnapshot> {
  try {
    const [counterKeys, gaugeKeys, histKeys] = await Promise.all([
      redis.keys(`${PREFIX}counter:*`),
      redis.keys(`${PREFIX}gauge:*`),
      redis.keys(`${PREFIX}hist:*`),
    ])

    const [counterVals, gaugeVals] = await Promise.all([
      counterKeys.length ? redis.mget(...counterKeys) : Promise.resolve([]),
      gaugeKeys.length ? redis.mget(...gaugeKeys) : Promise.resolve([]),
    ])

    const counters: Record<string, number> = {}
    counterKeys.forEach((k, i) => {
      counters[k.replace(`${PREFIX}counter:`, '')] = parseFloat(counterVals[i] ?? '0')
    })

    const gauges: Record<string, number> = {}
    gaugeKeys.forEach((k, i) => {
      gauges[k.replace(`${PREFIX}gauge:`, '')] = parseFloat(gaugeVals[i] ?? '0')
    })

    const histograms: MetricsSnapshot['histograms'] = {}
    await Promise.all(
      histKeys.map(async (k) => {
        const name = k.replace(`${PREFIX}hist:`, '')
        const p = await getHistogramPercentiles(name)
        if (p) histograms[name] = p
      }),
    )

    return { counters, gauges, histograms, collectedAt: new Date().toISOString() }
  } catch {
    return { counters: {}, gauges: {}, histograms: {}, collectedAt: new Date().toISOString() }
  }
}

// ---------------------------------------------------------------------------
// Prometheus text format serialiser
// ---------------------------------------------------------------------------

export function toPrometheusText(snapshot: MetricsSnapshot): string {
  const lines: string[] = []

  for (const [name, value] of Object.entries(snapshot.counters)) {
    const safeName = name.replace(/[^a-z0-9_]/gi, '_')
    lines.push(`# TYPE ${safeName} counter`)
    lines.push(`${safeName} ${value}`)
  }

  for (const [name, value] of Object.entries(snapshot.gauges)) {
    const safeName = name.replace(/[^a-z0-9_]/gi, '_')
    lines.push(`# TYPE ${safeName} gauge`)
    lines.push(`${safeName} ${value}`)
  }

  for (const [name, p] of Object.entries(snapshot.histograms)) {
    const safeName = name.replace(/[^a-z0-9_]/gi, '_')
    lines.push(`# TYPE ${safeName} summary`)
    lines.push(`${safeName}{quantile="0.5"} ${p.p50}`)
    lines.push(`${safeName}{quantile="0.95"} ${p.p95}`)
    lines.push(`${safeName}{quantile="0.99"} ${p.p99}`)
    lines.push(`${safeName}_count ${p.count}`)
  }

  return lines.join('\n') + '\n'
}
