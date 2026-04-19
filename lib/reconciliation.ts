import type { Row, ReconciliationResult } from './types'

export function analyse(
  rows: Row[], amountCol: string,
  dateCol: string | null, idCol: string | null, descCol: string | null
): ReconciliationResult {
  const flags: string[] = []

  // Sequence gaps
  let idGaps: number[] = [], idGapCount = 0
  if (idCol) {
    const ids = rows.map(r => parseInt(String(r[idCol] ?? ''))).filter(n => !isNaN(n) && isFinite(n)).sort((a,b)=>a-b)
    if (ids.length > 1) {
      const idSet  = new Set(ids)
      const range  = ids[ids.length-1] - ids[0] + 1
      idGapCount   = Math.max(0, range - idSet.size)
      // only materialise the list when range is small enough
      if (range <= 10_000) {
        for (let i = ids[0]; i <= ids[ids.length-1]; i++) {
          if (!idSet.has(i)) idGaps.push(i)
        }
      }
      if (idGapCount > 0) flags.push(`${idGapCount} missing transaction ID(s) — possible deleted entries`)
    }
  }

  // Weekend transactions
  let weekendCount = 0
  const weekendTxns: Row[] = []
  if (dateCol) {
    rows.forEach(row => {
      const d = new Date(String(row[dateCol] ?? ''))
      if (!isNaN(d.getTime()) && (d.getDay() === 0 || d.getDay() === 6)) {
        weekendCount++
        weekendTxns.push(row)
      }
    })
    if (weekendCount > 0) flags.push(`${weekendCount} weekend transactions (${(weekendCount/rows.length*100).toFixed(1)}% of total)`)
  }

  // Negative entries
  const negativeTxns = rows.filter(r => parseFloat(String(r[amountCol] ?? '')) < 0)
  const negativeCount = negativeTxns.length
  if (negativeCount > 0) flags.push(`${negativeCount} negative/reversal entries — verify each has a matching original`)

  // Missing descriptions
  let missingDescCount = 0
  const missingDesc: Row[] = []
  if (descCol) {
    rows.forEach(row => {
      const v = String(row[descCol] ?? '').trim()
      if (!v) { missingDescCount++; missingDesc.push(row) }
    })
    if (missingDescCount > 0) flags.push(`${missingDescCount} transactions with missing description`)
  }

  // Concentration risk
  const payeeMap = new Map<string, number>()
  if (descCol) {
    rows.forEach(row => {
      const name  = String(row[descCol] ?? 'Unknown').trim() || 'Unknown'
      const v     = parseFloat(String(row[amountCol] ?? '0'))
      if (!isNaN(v) && v > 0) payeeMap.set(name, (payeeMap.get(name) ?? 0) + v)
    })
  }
  const totalSpend = [...payeeMap.values()].reduce((a,b) => a+b, 0)
  const topPayees  = [...payeeMap.entries()]
    .sort((a,b) => b[1]-a[1]).slice(0,10)
    .map(([name, total]) => ({ name, total, share: parseFloat((total/totalSpend*100).toFixed(1)) }))
  if (topPayees.length && topPayees[0].share > 30)
    flags.push(`Top payee accounts for ${topPayees[0].share}% of total spend — concentration risk`)

  // Balances
  const allAmounts  = rows.map(r => parseFloat(String(r[amountCol] ?? '0'))).filter(v => !isNaN(v))
  const totalDebits  = allAmounts.filter(v => v > 0).reduce((a,b) => a+b, 0)
  const totalCredits = allAmounts.filter(v => v < 0).reduce((a,b) => a+b, 0)
  const netBalance   = allAmounts.reduce((a,b) => a+b, 0)

  return {
    idGaps: idGaps.slice(0,50), idGapCount,
    weekendCount, weekendTxns,
    negativeCount, negativeTxns,
    missingDescCount, missingDesc,
    topPayees, totalDebits, totalCredits, netBalance, flags,
  }
}
