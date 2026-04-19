import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { analyse as benfordsAnalyse } from '@/lib/benfords'
import { detect as anomalyDetect } from '@/lib/anomaly'
import { analyse as reconAnalyse } from '@/lib/reconciliation'
import { computeScore } from '@/lib/score'
import type { Row } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const form      = await req.formData()
    const file      = form.get('file') as File | null
    const amountCol = form.get('amountCol') as string
    const dateCol   = (form.get('dateCol') as string) || null
    const descCol   = (form.get('descCol') as string) || null
    const idCol     = (form.get('idCol') as string) || null

    if (!file || !amountCol) {
      return NextResponse.json({ error: 'Missing file or amount column' }, { status: 400 })
    }

    const text   = await file.text()
    const parsed = Papa.parse<Row>(text, { header: true, dynamicTyping: true, skipEmptyLines: true })
    const rows   = parsed.data

    const amounts = rows
      .map(r => parseFloat(String(r[amountCol] ?? '')))
      .filter(v => !isNaN(v) && v !== 0)
      .map(v => Math.abs(v))

    const benford = benfordsAnalyse(amounts)
    const anomaly = anomalyDetect(rows, amountCol, dateCol, descCol)
    const recon   = reconAnalyse(rows, amountCol, dateCol, idCol, descCol)
    const { score, riskLabel, riskColor } = computeScore(benford, anomaly, recon)

    return NextResponse.json({ benford, anomaly, recon, score, riskLabel, riskColor, rowCount: rows.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
