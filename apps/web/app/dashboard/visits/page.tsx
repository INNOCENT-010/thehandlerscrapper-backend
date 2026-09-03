'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Visit = {
  id: string
  scheduled_for: string
  purpose: string | null
  outcome: string | null
  notes: string | null
  school: {
    id: string
    school_name: string
    phone: string | null
    address: string | null
  } | null
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVisits()
  }, [])

  async function loadVisits() {
    setLoading(true)

    const response = await fetch('/api/visits')
    const data = await response.json()

    setVisits(data.visits ?? [])
    setLoading(false)
  }

  const upcoming = visits.filter(
    visit => new Date(visit.scheduled_for) >= new Date()
  )

  const past = visits.filter(
    visit => new Date(visit.scheduled_for) < new Date()
  )

  return (
    <main className="dashboard-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">FIELD SALES</div>
          <h1>Visits</h1>
          <p>
            Manage school visits and keep track of what happened in the field.
          </p>
        </div>

        <Link href="/dashboard" className="button secondary">
          Dashboard
        </Link>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Upcoming</span>
          <strong>{upcoming.length}</strong>
        </div>

        <div className="stat-card">
          <span>Completed</span>
          <strong>{past.length}</strong>
        </div>

        <div className="stat-card">
          <span>Total visits</span>
          <strong>{visits.length}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Upcoming visits</h2>
            <p>Your next school visits.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading visits...</div>
        ) : upcoming.length === 0 ? (
          <div className="empty-state">
            <strong>No visits scheduled</strong>
            <p>
              Schedule visits from a lead when you're ready to work the
              territory.
            </p>
          </div>
        ) : (
          <div className="activity-list">
            {upcoming.map(visit => (
              <VisitRow key={visit.id} visit={visit} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Visit history</h2>
            <p>Previous field visits and their outcomes.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : past.length === 0 ? (
          <div className="empty-state">
            No completed visits yet.
          </div>
        ) : (
          <div className="activity-list">
            {past.map(visit => (
              <VisitRow key={visit.id} visit={visit} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function VisitRow({ visit }: { visit: Visit }) {
  return (
    <Link
      href={
        visit.school
          ? `/dashboard/leads/${visit.school.id}`
          : '/dashboard'
      }
      className="activity-row"
    >
      <div className="activity-main">
        <strong>
          {visit.school?.school_name ?? 'Unknown school'}
        </strong>

        <span>
          {new Date(visit.scheduled_for).toLocaleString('en-NG', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>

        {visit.school?.address && (
          <span>{visit.school.address}</span>
        )}
      </div>

      <div className="activity-meta">
        <span className="status-pill">
          {visit.outcome || visit.purpose || 'Scheduled'}
        </span>
      </div>
    </Link>
  )
}