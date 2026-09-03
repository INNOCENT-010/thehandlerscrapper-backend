import Link from 'next/link'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">T</span><div><b>TheHandler</b><small>Lead Engine</small></div></div>
      <nav className="side-nav">
        <Link href="/dashboard">Overview</Link>
        <Link href="/dashboard/discover">Discover schools</Link>
        <Link href="/leads">Leads</Link>
        <Link href="/dashboard/visits">Visits</Link>
        <Link href="/dashboard/follow-ups">Follow-ups</Link>
        <Link href="/dashboard/distribution">Distribution</Link>
      </nav>
      <div className="side-footer"><span>Field sales</span><span className="live-dot">Live</span></div>
    </aside>
    <main className="dashboard-main">{children}</main>
  </div>
}
