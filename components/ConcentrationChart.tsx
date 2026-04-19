'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Payee { name: string; total: number; share: number }

export default function ConcentrationChart({ data }: { data: Payee[] }) {
  const chartData = [...data].reverse().map(p => ({ name: p.name.length > 20 ? p.name.slice(0,18)+'…' : p.name, share: p.share }))
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart layout="vertical" data={chartData} margin={{ top:8, right:24, bottom:8, left:8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" horizontal={false} />
        <XAxis type="number" tick={{ fill:'#4a6a9a', fontSize:12 }} axisLine={{ stroke:'#1a2233' }} tickLine={false} tickFormatter={v => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fill:'#8a9ab8', fontSize:11 }} axisLine={false} tickLine={false} width={120} />
        <Tooltip contentStyle={{ background:'#0f1520', border:'1px solid #1e2d44', borderRadius:8, color:'#e8eaf0' }} formatter={(v:number) => [`${v}%`, '% of spend']} />
        <Bar dataKey="share" fill="#1e4db7" opacity={0.8} radius={[0,3,3,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
