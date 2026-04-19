'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Row } from '@/lib/types'

export default function DistributionChart({ outliers, amountCol }: { outliers: Row[], amountCol: string }) {
  // Build a simple log10 histogram from outlier data label context
  const bins = Array.from({ length: 10 }, (_, i) => ({ range: `10^${i}`, count: 0 }))
  outliers.forEach(r => {
    const v = Math.abs(parseFloat(String(r[amountCol] ?? '0')))
    if (v > 0) {
      const idx = Math.min(Math.floor(Math.log10(v)), 9)
      if (idx >= 0) bins[idx].count++
    }
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={bins} margin={{ top:8, right:16, bottom:8, left:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" />
        <XAxis dataKey="range" tick={{ fill:'#4a6a9a', fontSize:11 }} axisLine={{ stroke:'#1a2233' }} tickLine={false} />
        <YAxis tick={{ fill:'#4a6a9a', fontSize:12 }} axisLine={{ stroke:'#1a2233' }} tickLine={false} />
        <Tooltip contentStyle={{ background:'#0f1520', border:'1px solid #1e2d44', borderRadius:8, color:'#e8eaf0' }} />
        <Bar dataKey="count" name="Outliers" fill="#1e4db7" opacity={0.8} radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
