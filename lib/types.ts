export interface Row { [key: string]: string | number | null }

export interface BenfordsResult {
  n: number
  digits: number[]
  observedFreq: number[]
  expectedFreq: number[]
  observedCounts: number[]
  mad: number
  chi2Stat: number
  pValue: number
  riskLevel: string
  riskColor: string
  conforming: boolean
}

export interface AnomalyResult {
  outliers: Row[]
  outlierCount: number
  duplicateCount: number
  duplicates: Row[]
  round1000Count: number
  round10000Count: number
  roundPct: number
  roundFlag: boolean
  justBelow: Row[]
  justBelowCount: number
  mean: number
  std: number
  q1: number
  q3: number
  iqrHi: number
  iqrLow: number
}

export interface ReconciliationResult {
  idGaps: number[]
  idGapCount: number
  weekendCount: number
  weekendTxns: Row[]
  negativeCount: number
  negativeTxns: Row[]
  missingDescCount: number
  missingDesc: Row[]
  topPayees: { name: string; total: number; share: number }[]
  totalDebits: number
  totalCredits: number
  netBalance: number
  flags: string[]
}

export interface AnalyseRequest {
  rows: Row[]
  amountCol: string
  dateCol: string | null
  descCol: string | null
  idCol: string | null
}

export interface AnalyseResponse {
  benford: BenfordsResult
  anomaly: AnomalyResult
  recon: ReconciliationResult
  score: number
  riskLabel: string
  riskColor: string
  rowCount: number
}
