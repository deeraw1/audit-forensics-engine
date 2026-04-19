import type { Row, AnomalyResult } from './types'

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos), hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function detect(
  rows: Row[], amountCol: string, dateCol: string | null, descCol: string | null
): AnomalyResult {
  const amounts = rows
    .map(r => parseFloat(String(r[amountCol] ?? '')))
    .filter(v => !isNaN(v) && isFinite(v))
    .map(v => Math.abs(v))
    .filter(v => v > 0)

  if (amounts.length === 0) {
    return {
      outliers: [], outlierCount: 0,
      duplicateCount: 0, duplicates: [],
      round1000Count: 0, round10000Count: 0, roundPct: 0, roundFlag: false,
      justBelow: [], justBelowCount: 0,
      mean: 0, std: 0, q1: 0, q3: 0, iqrHi: 0, iqrLow: 0,
    }
  }

  const mean = amounts.reduce((a,b) => a+b, 0) / amounts.length
  const std  = Math.sqrt(amounts.reduce((s,v) => s + Math.pow(v-mean,2), 0) / amounts.length)
  const sorted = [...amounts].sort((a,b) => a-b)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const iqr   = q3 - q1
  const iqrLo = q1 - 1.5*iqr
  const iqrHi = q3 + 1.5*iqr

  const outliers: Row[] = []
  rows.forEach(row => {
    const raw = parseFloat(String(row[amountCol] ?? ''))
    if (isNaN(raw) || raw === 0) return
    const v = Math.abs(raw)
    const z = std > 0 ? (v - mean) / std : 0
    if (Math.abs(z) > 3 || v < iqrLo || v > iqrHi) {
      outliers.push({ ...row, z_score: parseFloat(z.toFixed(2)), _flag_type: Math.abs(z) > 3 ? 'Z-score outlier' : 'IQR outlier' })
    }
  })

  // Duplicates
  const seen = new Map<string, number>()
  rows.forEach((row, i) => {
    const key = [row[amountCol], dateCol ? row[dateCol] : '', descCol ? row[descCol] : ''].join('|')
    seen.set(key, (seen.get(key) ?? 0) + 1)
  })
  const duplicates = rows.filter(row => {
    const key = [row[amountCol], dateCol ? row[dateCol] : '', descCol ? row[descCol] : ''].join('|')
    return (seen.get(key) ?? 0) > 1
  })

  // Round numbers
  const round1000Count  = amounts.filter(v => v % 1000  === 0).length
  const round10000Count = amounts.filter(v => v % 10000 === 0).length
  const roundPct        = round1000Count / amounts.length * 100
  const roundFlag       = roundPct > 15

  // Just-below threshold
  const thresholds = [500_000, 1_000_000, 5_000_000, 10_000_000]
  const justBelow: Row[] = []
  rows.forEach(row => {
    const v = Math.abs(parseFloat(String(row[amountCol] ?? '')))
    if (isNaN(v) || v === 0) return
    for (const t of thresholds) {
      if (v >= t * 0.95 && v < t) {
        justBelow.push({ ...row, _flag_type: `Just-below ${t.toLocaleString()}` })
        break
      }
    }
  })

  return {
    outliers, outlierCount: outliers.length,
    duplicateCount: duplicates.length, duplicates,
    round1000Count, round10000Count, roundPct, roundFlag,
    justBelow, justBelowCount: justBelow.length,
    mean, std, q1, q3, iqrHi, iqrLow: iqrLo,
  }
}
