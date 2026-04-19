import type { BenfordsResult } from './types'

const DIGITS = [1,2,3,4,5,6,7,8,9]
const EXPECTED: Record<number,number> = {}
DIGITS.forEach(d => { EXPECTED[d] = Math.log10(1 + 1/d) })

function logGamma(x: number): number {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,
             -1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5]
  let y = x, tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) ser += c[j] / ++y
  return -tmp + Math.log(2.5066282746310005 * ser / x)
}

function incompleteGamma(a: number, x: number): number {
  if (x <= 0) return 0
  if (x < a + 1) {
    let ap = a, sum = 1/a, del = sum
    for (let i = 0; i < 200; i++) {
      ap += 1; del *= x/ap; sum += del
      if (Math.abs(del) < Math.abs(sum) * 1e-10) break
    }
    return sum * Math.exp(-x + a*Math.log(x) - logGamma(a))
  }
  let b = x+1-a, c = 1/1e-30, d = 1/b, h = d
  for (let i = 1; i <= 200; i++) {
    const an = -i*(i-a); b += 2
    d = an*d+b; if (Math.abs(d) < 1e-30) d = 1e-30
    c = b+an/c; if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1/d; h *= d*c
    if (Math.abs(d*c-1) < 1e-10) break
  }
  return 1 - Math.exp(-x + a*Math.log(x) - logGamma(a)) * h
}

function chiSquarePValue(chi2: number, df: number): number {
  return Math.max(0, Math.min(1, 1 - incompleteGamma(df/2, chi2/2)))
}

function firstDigit(x: number): number | null {
  const s = Math.abs(x).toString().replace('.','').replace(/^0+/,'')
  return s.length ? parseInt(s[0]) : null
}

export function analyse(values: number[]): BenfordsResult {
  const digits = values
    .map(v => firstDigit(v))
    .filter((d): d is number => d !== null && d >= 1 && d <= 9)
  const n = digits.length

  const obsCounts: Record<number,number> = {}
  DIGITS.forEach(d => { obsCounts[d] = 0 })
  digits.forEach(d => { obsCounts[d]++ })

  const obsFreq: Record<number,number> = {}
  DIGITS.forEach(d => { obsFreq[d] = obsCounts[d] / n })

  const mad = DIGITS.reduce((s,d) => s + Math.abs(obsFreq[d] - EXPECTED[d]), 0) / 9

  const chi2 = DIGITS.reduce((s,d) => {
    const exp = EXPECTED[d] * n
    return s + Math.pow(obsCounts[d] - exp, 2) / exp
  }, 0)
  const pValue = chiSquarePValue(chi2, 8)

  let riskLevel: string, riskColor: string
  if      (mad < 0.006)  { riskLevel = 'Close Conformity';           riskColor = '#1e8449' }
  else if (mad < 0.012)  { riskLevel = 'Acceptable Conformity';      riskColor = '#7a9a2a' }
  else if (mad < 0.015)  { riskLevel = 'Marginal — Investigate';     riskColor = '#d68910' }
  else                   { riskLevel = 'Non-Conformity — High Risk';  riskColor = '#c0392b' }

  return {
    n, digits: DIGITS,
    observedFreq:   DIGITS.map(d => obsFreq[d]),
    expectedFreq:   DIGITS.map(d => EXPECTED[d]),
    observedCounts: DIGITS.map(d => obsCounts[d]),
    mad, chi2Stat: chi2, pValue,
    riskLevel, riskColor,
    conforming: mad < 0.015,
  }
}
