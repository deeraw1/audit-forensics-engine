'use client'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BenfordsResult } from '@/lib/types'

export default function BenfordsChart({ data }: { data: BenfordsResult }) {
  const chartData = data.digits.map((d, i) => ({
    digit:    String(d),
    Observed: parseFloat((data.observedFreq[i] * 100).toFixed(2)),
    Expected: parseFloat((data.expectedFreq[i] * 100).toFixed(2)),
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top:8, right:16, bottom:8, left:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" />
        <XAxis dataKey="digit" tick={{ fill:'#4a6a9a', fontSize:13 }} axisLine={{ stroke:'#1a2233' }} tickLine={false} label={{ value:'First Digit', fill:'#4a6a9a', fontSize:12, position:'insideBottom', offset:-2 }} />
        <YAxis tick={{ fill:'#4a6a9a', fontSize:12 }} axisLine={{ stroke:'#1a2233' }} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip
          contentStyle={{ background:'#0f1520', border:'1px solid #1e2d44', borderRadius:8, color:'#e8eaf0' }}
          formatter={(v: number) => [`${v}%`]}
        />
        <Legend wrapperStyle={{ color:'#8a9ab8', fontSize:'0.82rem', paddingTop:8 }} />
        <Bar dataKey="Observed" fill="#1e4db7" opacity={0.85} radius={[3,3,0,0]} />
        <Line dataKey="Expected" stroke="#f39c12" strokeWidth={2} strokeDasharray="5 4" dot={{ fill:'#f39c12', r:4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
