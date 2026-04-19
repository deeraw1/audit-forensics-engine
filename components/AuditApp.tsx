'use client'
import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Papa from 'papaparse'
import type { AnalyseResponse, Row } from '@/lib/types'

const BenfordsChart      = dynamic(() => import('./BenfordsChart'),      { ssr: false })
const DistributionChart  = dynamic(() => import('./DistributionChart'),  { ssr: false })
const ConcentrationChart = dynamic(() => import('./ConcentrationChart'), { ssr: false })

const fmt  = (n: number) => '₦' + n.toLocaleString('en-NG', { minimumFractionDigits:0, maximumFractionDigits:0 })
const NONE = '— none —'

function HTable({ rows, headers }: { rows: string[][], headers: string[] }) {
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:10, overflowX:'auto', height:'100%' }}>
      <table className="htable" style={{ minWidth:'100%', whiteSpace:'nowrap' }}>
        <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryTable({ rows }: { rows: string[][] }) {
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
      <table className="htable" style={{ width:'100%' }}>
        <thead><tr><th>Item</th><th>Value</th></tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={i === rows.length-1 ? { background:'#0d1825' } : {}}>
              {row.map((cell, j) => (
                <td key={j} style={i === rows.length-1 ? { color:'#7dd4a0', fontWeight:700 } : {}}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricCard({ label, value, sub, color, highlight }: { label:string, value:string, sub:string, color:string, highlight?:boolean }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg,#0d1f3c,#122a5a)' : 'var(--surface)',
      border:`${highlight?'2px':'1px'} solid ${highlight?color:'var(--border)'}`,
      borderRadius:12, padding:'20px 16px', textAlign:'center',
    }}>
      <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase', color, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:highlight?'1.8rem':'1.5rem', fontWeight:800, color:highlight?'#fff':'var(--text)', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:'0.74rem', color, marginTop:6 }}>{sub}</div>
    </div>
  )
}

const GUIDE_ROWS = [
  ['amount',               'Numeric', 'Required',    '#c0392b'],
  ['date',                 'Date',    'Recommended', '#d68910'],
  ['vendor / description', 'Text',    'Recommended', '#d68910'],
  ['txn_id',               'Integer', 'Recommended', '#d68910'],
  ['category',             'Text',    'Optional',    '#1e8449'],
]

export default function AuditApp() {
  const [preview,    setPreview]    = useState<Row[] | null>(null)
  const [columns,    setColumns]    = useState<string[]>([])
  const [file,       setFile]       = useState<File | null>(null)
  const [dragging,   setDragging]   = useState(false)
  const [amountCol,  setAmountCol]  = useState('')
  const [dateCol,    setDateCol]    = useState(NONE)
  const [descCol,    setDescCol]    = useState(NONE)
  const [idCol,      setIdCol]      = useState(NONE)
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<AnalyseResponse | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [totalRows,  setTotalRows]  = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback((text: string) => {
    const parsed = Papa.parse<Row>(text, { header:true, dynamicTyping:true, skipEmptyLines:true })
    const rows   = parsed.data
    const cols   = parsed.meta.fields ?? []
    setTotalRows(rows.length)
    setPreview(rows.slice(0, 5))
    setColumns(cols)
    setResult(null)
    setError(null)
    setAmountCol(cols.find(c => /amount|value|sum|debit|credit/i.test(c)) ?? cols[0] ?? '')
    setDateCol(cols.find(c => /date|time/i.test(c)) ?? NONE)
    setDescCol(cols.find(c => /vendor|description|payee|narration|desc|name/i.test(c)) ?? NONE)
    setIdCol(cols.find(c => /^(id|txn_id|transaction_id|ref|reference)$/i.test(c)) ?? NONE)
  }, [])

  const handleFile = useCallback((f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => loadFile(e.target?.result as string)
    reader.readAsText(f)
  }, [loadFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]; if (f) handleFile(f)
  }

  const handleAnalyse = async () => {
    if (!file || !amountCol) return
    setLoading(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('amountCol', amountCol)
      if (dateCol !== NONE) form.append('dateCol', dateCol)
      if (descCol !== NONE) form.append('descCol', descCol)
      if (idCol   !== NONE) form.append('idCol',   idCol)
      const res  = await fetch('/api/analyse', { method:'POST', body:form })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior:'smooth' }), 100)
    } catch(e) { setError(String(e)) }
    finally    { setLoading(false) }
  }

  const allFlags: { level:'high'|'medium', text:string }[] = result ? [
    ...(!result.benford.conforming ? [{ level:'high' as const, text:`Benford's Law non-conformity: MAD = ${result.benford.mad.toFixed(4)} (${result.benford.riskLevel}) — p-value = ${result.benford.pValue.toFixed(4)}` }] : []),
    ...(result.anomaly.duplicateCount   > 0 ? [{ level:'high'   as const, text:`${result.anomaly.duplicateCount} duplicate transactions detected` }] : []),
    ...(result.anomaly.justBelowCount   > 0 ? [{ level:'high'   as const, text:`${result.anomaly.justBelowCount} just-below-threshold transactions — possible approval limit circumvention` }] : []),
    ...(result.anomaly.roundFlag            ? [{ level:'medium' as const, text:`${result.anomaly.round1000Count} round-thousand transactions (${result.anomaly.roundPct.toFixed(1)}% of total) — exceeds 15% threshold` }] : []),
    ...(result.anomaly.outlierCount     > 0 ? [{ level:'medium' as const, text:`${result.anomaly.outlierCount} statistical outliers detected (Z-score / IQR method)` }] : []),
    ...result.recon.flags.map(f => ({ level:(f.toLowerCase().includes('missing')||f.toLowerCase().includes('gap')?'high':'medium') as 'high'|'medium', text:f })),
  ] : []

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 1.5rem 5rem' }}>

      {/* Hero */}
      <div style={{
        background:'linear-gradient(135deg,#0d1f3c 0%,#1a3a6b 55%,#1e4db7 100%)',
        borderRadius:16, padding:'48px 52px', marginBottom:36, position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', right:40, top:-10, fontSize:180, opacity:0.06, color:'#fff', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>&#10022;</div>
        <h1 style={{ fontSize:'2.1rem', fontWeight:800, color:'#fff', marginBottom:8 }}>Audit Forensics Engine</h1>
        <p style={{ color:'#a8c4f0', fontSize:'1rem' }}>Upload a transaction file. Get Benford&apos;s Law analysis, statistical anomalies, duplicates, and reconciliation gaps — instantly.</p>
        <div style={{ marginTop:20, display:'flex', gap:8, flexWrap:'wrap' }}>
          {["Benford's Law","Anomaly Detection","Duplicate Flagging","Round Number Bias","Sequence Gap Analysis","Concentration Risk"].map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>

      {/* Step 01 — Upload */}
      <div className="section-label">Step 01</div>
      <div className="section-title">Upload Transaction Data</div>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          background: dragging ? '#0f1d30' : 'var(--surface)',
          border: `2px dashed ${dragging ? 'var(--accent2)' : 'var(--border2)'}`,
          borderRadius:14, padding:'40px 24px', textAlign:'center',
          cursor:'pointer', transition:'all 0.2s', marginBottom:file?16:0,
        }}
      >
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display:'none' }} />
        {file ? (
          <>
            <div style={{ color:'var(--text)', fontWeight:700, fontSize:'0.95rem', marginBottom:4 }}>{file.name}</div>
            <div style={{ color:'var(--faint)', fontSize:'0.8rem' }}>{(file.size/1024).toFixed(1)} KB · click to replace</div>
          </>
        ) : (
          <>
            <div style={{ color:'var(--muted)', fontWeight:600, marginBottom:6 }}>Click to browse or drag a file here</div>
            <div style={{ color:'var(--faint)', fontSize:'0.8rem' }}>CSV or Excel · One transaction per row</div>
          </>
        )}
      </div>

      {/* Preview + Column Guide */}
      {preview && columns.length > 0 && (
        <>
          <hr />
          <div className="section-label">Preview</div>
          <div className="section-title">Data Preview & Column Guide</div>

          <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:28, alignItems:'stretch', marginBottom:32 }}>

            {/* Preview table */}
            <div style={{ display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--accent2)', marginBottom:10, letterSpacing:1, textTransform:'uppercase' }}>
                First 5 rows of {totalRows.toLocaleString()}
              </div>
              <div style={{ overflowX:'auto', flex:1 }}>
                <HTable headers={columns} rows={preview.map(r => columns.map(c => String(r[c] ?? '')))} />
              </div>
              <p style={{ color:'var(--faint)', fontSize:'0.72rem', marginTop:8 }}>
                {columns.length} columns · {(file?.size ? file.size/1024 : 0).toFixed(1)} KB
              </p>
            </div>

            {/* Column guide */}
            <div style={{ display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--accent2)', marginBottom:10, letterSpacing:1, textTransform:'uppercase' }}>
                Required & Recommended Columns
              </div>
              <div style={{ flex:1, border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                <table className="htable" style={{ width:'100%', height:'100%' }}>
                  <thead><tr><th>Column</th><th>Type</th><th>Status</th></tr></thead>
                  <tbody>
                    {GUIDE_ROWS.map(([col, type, status, color], i) => (
                      <tr key={i} style={{ background: i%2===0?'var(--surface)':'var(--surface2)' }}>
                        <td style={{ fontFamily:'monospace', color:'var(--text)', fontSize:'0.8rem' }}>{col}</td>
                        <td style={{ color:'var(--muted)' }}>{type}</td>
                        <td>
                          <span style={{ background:`${color}22`, color, border:`1px solid ${color}55`, borderRadius:12, padding:'2px 9px', fontSize:'0.68rem', fontWeight:700 }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop:10, padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, color:'var(--faint)', fontSize:'0.76rem', lineHeight:1.7 }}>
                <strong style={{ color:'var(--muted)' }}>Column names are flexible</strong> — map any header below.<br/>
                <strong style={{ color:'var(--muted)' }}>Minimum to run:</strong> one numeric amount column.
              </div>
            </div>
          </div>

          {/* Step 02 — Column mapping */}
          <hr />
          <div className="section-label">Step 02</div>
          <div className="section-title">Map Your Columns</div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
            {([
              { label:'Amount column *', value:amountCol, setter:setAmountCol, opts:columns },
              { label:'Date column',     value:dateCol,   setter:setDateCol,   opts:[NONE,...columns] },
              { label:'Description / Payee', value:descCol, setter:setDescCol, opts:[NONE,...columns] },
              { label:'Transaction ID',  value:idCol,     setter:setIdCol,     opts:[NONE,...columns] },
            ] as const).map(({ label, value, setter, opts }) => (
              <div key={label}>
                <label className="field-label">{label}</label>
                <select className="select-field" value={value} onChange={e => (setter as (v:string)=>void)(e.target.value)}>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background:'#1a0808', border:'1px solid #4a1515', borderRadius:8, padding:'11px 16px', color:'#e88a8a', fontSize:'0.84rem', marginBottom:16 }}>
              {error}
            </div>
          )}

          <button className="btn-primary" onClick={handleAnalyse} disabled={loading || !amountCol || !file}>
            {loading ? 'Analysing...' : 'Run Forensic Analysis'}
          </button>
        </>
      )}

      {/* ── Results ── */}
      {result && (
        <div id="results">
          <hr />
          <div className="section-label">Results</div>
          <div className="section-title">Forensic Risk Summary</div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
            <MetricCard label="Overall Risk Score"   value={`${result.score}/100`}                   sub={result.riskLabel}          color={result.riskColor} highlight />
            <MetricCard label="Benford's Law"        value={`MAD ${result.benford.mad.toFixed(4)}`}  sub={result.benford.riskLevel}  color="#1e4db7" />
            <MetricCard label="Statistical Outliers" value={String(result.anomaly.outlierCount)}     sub="Anomalies"                 color="#1a3a6b" />
            <MetricCard label="Duplicate Entries"    value={String(result.anomaly.duplicateCount)}   sub="Duplicates"                color="#1a3a6b" />
            <MetricCard label="Sequence ID Gaps"     value={String(result.recon.idGapCount)}         sub="Gaps"                      color="#1a3a6b" />
          </div>

          {/* Flags */}
          {allFlags.length > 0 && (
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--accent2)', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>Findings & Flags</div>
              {allFlags.map((f, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'11px 16px', borderRadius:8, marginBottom:8, background:'var(--surface)', border:'1px solid var(--border2)' }}>
                  <span className="flag-dot" style={{ background:f.level==='high'?'#c0392b':'#d68910' }} />
                  <span style={{ color:'#c8d4e8', fontSize:'0.85rem', lineHeight:1.4 }}>{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Benford */}
          <hr />
          <div className="section-label">Analysis 01</div>
          <div className="section-title">Benford&apos;s Law — First Digit Distribution</div>
          <p style={{ color:'var(--faint)', fontSize:'0.84rem', marginTop:-16, marginBottom:20 }}>
            {result.benford.n.toLocaleString()} transactions · {result.benford.riskLevel} · MAD = {result.benford.mad.toFixed(4)} · chi-square p = {result.benford.pValue.toFixed(4)}
          </p>
          <BenfordsChart data={result.benford} />

          {/* Distribution */}
          <hr />
          <div className="section-label">Analysis 02</div>
          <div className="section-title">Transaction Amount Distribution</div>
          <DistributionChart outliers={result.anomaly.outliers} amountCol={amountCol} />

          {result.anomaly.outliers.length > 0 && (() => {
            const cols = [idCol!==NONE?idCol:null, dateCol!==NONE?dateCol:null, descCol!==NONE?descCol:null, amountCol, 'z_score', '_flag_type'].filter(Boolean) as string[]
            return (
              <>
                <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--accent2)', letterSpacing:1, textTransform:'uppercase', margin:'20px 0 10px' }}>Top Outliers</div>
                <HTable headers={cols.map(c => c.replace(/_/g,' '))} rows={result.anomaly.outliers.slice(0,15).map(r => cols.map(c => String(r[c] ?? '')))} />
              </>
            )
          })()}

          {/* Duplicates */}
          {result.anomaly.duplicateCount > 0 && (() => {
            const cols = [idCol!==NONE?idCol:null, dateCol!==NONE?dateCol:null, descCol!==NONE?descCol:null, amountCol].filter(Boolean) as string[]
            return (
              <>
                <hr />
                <div className="section-label">Analysis 03</div>
                <div className="section-title">Duplicate Transactions</div>
                <HTable headers={cols.map(c => c.replace(/_/g,' '))} rows={result.anomaly.duplicates.slice(0,20).map(r => cols.map(c => String(r[c] ?? '')))} />
              </>
            )
          })()}

          {/* Concentration */}
          {result.recon.topPayees.length > 0 && (
            <>
              <hr />
              <div className="section-label">Analysis 04</div>
              <div className="section-title">Payee Concentration Risk</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
                <HTable
                  headers={['Payee / Description','Total Spend','Share']}
                  rows={result.recon.topPayees.map(p => [p.name, fmt(p.total), `${p.share}%`])}
                />
                <ConcentrationChart data={result.recon.topPayees} />
              </div>
            </>
          )}

          {/* Reconciliation */}
          <hr />
          <div className="section-label">Analysis 05</div>
          <div className="section-title">Reconciliation Summary</div>
          <SummaryTable rows={[
            ['Total transactions',          result.rowCount.toLocaleString()],
            ['Total debits',                fmt(result.recon.totalDebits)],
            ['Total credits / reversals',   fmt(Math.abs(result.recon.totalCredits))],
            ['Net balance',                 fmt(result.recon.netBalance)],
            ['Missing sequence IDs',        String(result.recon.idGapCount)],
            ['Weekend transactions',        String(result.recon.weekendCount)],
            ['Negative / reversal entries', String(result.recon.negativeCount)],
            ['Missing descriptions',        String(result.recon.missingDescCount)],
            ['Round-thousand entries',      `${result.anomaly.round1000Count} (${result.anomaly.roundPct.toFixed(1)}%)`],
            ['Just-below-threshold',        String(result.anomaly.justBelowCount)],
          ]} />

          <div style={{ marginTop:32, padding:'13px 18px', background:'var(--surface)', borderLeft:'3px solid var(--border2)', borderRadius:'0 8px 8px 0', color:'var(--faint)', fontSize:'0.78rem' }}>
            <strong style={{ color:'var(--muted)' }}>Disclaimer:</strong> This tool provides automated forensic indicators for preliminary review only. Findings are not conclusive evidence of fraud or error. All flagged items require professional judgement and further investigation by a qualified auditor.
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop:56, paddingTop:28, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div style={{ color:'var(--faint)', fontSize:'0.82rem', lineHeight:1.8 }}>
          <span style={{ color:'var(--muted)', fontWeight:700, fontSize:'0.85rem' }}>Muhammed Adediran</span><br/>
          Financial Data Analyst · Forensic Accounting · Risk Modelling<br/>
          <span style={{ color:'#2a3a50' }}>Have a dataset you want analysed, or need a custom build for your organisation?</span>
        </div>
        <a href="https://adediran.xyz/contact" target="_blank" rel="noreferrer"
          style={{ color:'var(--accent2)', fontWeight:600, fontSize:'0.85rem', border:'1px solid #1e3a6b', borderRadius:8, padding:'9px 20px', textDecoration:'none' }}>
          Get in touch
        </a>
      </div>
    </div>
  )
}
