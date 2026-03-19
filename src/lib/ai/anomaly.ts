// InsightForge – Anomaly Detection
// Statistical algorithms: Z-Score and EWMA (Exponentially Weighted Moving Average)

// ============================================================
// Types
// ============================================================

export type AnomalyPoint = {
  index: number
  timestamp: string
  value: number
  zScore: number
  ewmaDeviation: number
  isAnomaly: boolean
}

// ============================================================
// Algorithm: Z-Score
// Returns the Z-score for each value in the series
// ============================================================

export function zScore(values: number[]): number[] {
  if (values.length === 0) return []

  const n = values.length
  const mean = values.reduce((sum, v) => sum + v, 0) / n
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) {
    // All values are identical — no deviation
    return values.map(() => 0)
  }

  return values.map((v) => (v - mean) / stdDev)
}

// ============================================================
// Algorithm: EWMA (Exponentially Weighted Moving Average)
// alpha: smoothing factor, 0 < alpha < 1 (default 0.3)
// Returns the EWMA forecast for each position
// ============================================================

export function ewma(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return []

  const result: number[] = [values[0]!]

  for (let i = 1; i < values.length; i++) {
    const prev = result[i - 1]!
    const current = values[i]!
    result.push(alpha * current + (1 - alpha) * prev)
  }

  return result
}

// ============================================================
// Main function: detectAnomalies
// An anomaly is where |zScore| > 2.5 OR value deviates > 3x from EWMA
// ============================================================

export function detectAnomalies(
  values: number[],
  timestamps: string[],
): AnomalyPoint[] {
  if (values.length === 0) return []

  const zScores = zScore(values)
  const ewmaValues = ewma(values)

  return values.map((value, index) => {
    const z = zScores[index] ?? 0
    const ewmaValue = ewmaValues[index] ?? value
    const ewmaDeviation = ewmaValue !== 0 ? Math.abs(value - ewmaValue) / Math.abs(ewmaValue) : 0

    const isZScoreAnomaly = Math.abs(z) > 2.5
    const isEwmaAnomaly = ewmaDeviation > 3

    return {
      index,
      timestamp: timestamps[index] ?? '',
      value,
      zScore: z,
      ewmaDeviation,
      isAnomaly: isZScoreAnomaly || isEwmaAnomaly,
    }
  })
}
