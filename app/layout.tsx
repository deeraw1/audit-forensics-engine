import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Audit Forensics Engine',
  description: 'Financial transaction forensics — Benford\'s Law, anomaly detection, duplicate flagging, reconciliation gaps.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
