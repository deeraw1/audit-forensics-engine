import type { BenfordsResult, AnomalyResult, ReconciliationResult } from './types'

export function computeScore(b: BenfordsResult, a: AnomalyResult, r: ReconciliationResult) {
  let score = 0
  if      (b.mad > 0.015) score += 35
  else if (b.mad > 0.012) score += 20
  else if (b.mad > 0.006) score += 10
  if      (a.outlierCount > 10) score += 20
  else if (a.outlierCount > 3)  score += 10
  if (a.duplicateCount > 0) score += 15
  if (a.roundFlag)          score += 10
  if (a.justBelowCount > 0) score += 15
  if (r.idGapCount > 0)     score += 10
  if (r.negativeCount > 5)  score += 5
  score = Math.min(score, 100)
  if (score >= 60) return { score, riskLabel: 'High Risk',   riskColor: '#c0392b' }
  if (score >= 35) return { score, riskLabel: 'Medium Risk', riskColor: '#d68910' }
  return               { score, riskLabel: 'Low Risk',    riskColor: '#1e8449' }
}
