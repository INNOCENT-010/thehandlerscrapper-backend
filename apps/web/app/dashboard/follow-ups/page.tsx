'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type FollowUp = {
  id: string
  activity_type: string
  subject: string | null
  body: string | null
  created_at: string
  school: {
    id: string
    school_name: string
    phone: string | null
    email: string | null
    lead_score: number | null
    priority: string | null
  } | null
}

export default function FollowUpsPage() {
  const [activities, setActivities] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadFollowUps()
  }, [])

  async function loadFollowUps() {
    setLoading(true)

    const response = await fetch('/api/follow-ups')
    const data = await response.json()

    setActivities(data.activities ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return activities

    return activities.filter(
      activity => activity.activity_type === filter
    )
  }, [activities, filter])

  return (
    <main className="dashboard-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">SALES PIPELINE</div>
          <h1>Follow-ups</h1>
          <p>
            Keep conversations moving and make sure promising schools do not
            go cold.
          </p>
        </div>

        <Link href="/dashboard/leads" className="button">
          View leads
        </Link>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Open follow-ups</span>
          <strong>{activities.length}</strong>
        </div>

        <div className="stat-card">
          <span>Calls</span>
          <strong>
            {
              activities.filter(
                activity => activity.activity_type === 'call'
              ).length
            }
          </strong>
        </div>

        <div className="stat-card">
          <span>Messages</span>
          <strong>
            {
              activities.filter(
                activity => activity.activity_type === 'message'
              ).length
            }
          </strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Follow-up queue</h2>
            <p>Schools requiring another sales touch.</p>
          </div>

          <div className="filter-group">
            <button
              className={filter === 'all' ? 'filter active' : 'filter'}
              onClick={() => setFilter('all')}
            >
              All
            </button>

            <button
              className={filter === 'call' ? 'filter active' : 'filter'}
              onClick={() => setFilter('call')}
            >
              Calls
            </button>

            <button
              className={filter === 'message' ? 'filter active' : 'filter'}
              onClick={() => setFilter('message')}
            >
              Messages
            </button>

            <button
              className={filter === 'email' ? 'filter active' : 'filter'}
              onClick={() => setFilter('email')}
            >
              Email
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading follow-ups...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <strong>No follow-ups found</strong>
            <p>
              Your follow-up queue will appear here as sales activities are
              recorded.
            </p>
          </div>
        ) : (
          <div className="follow-up-list">
            {filtered.map(activity => (
              <FollowUpRow
                key={activity.id}
                activity={activity}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function FollowUpRow({
  activity,
}: {
  activity: FollowUp
}) {
  const school = activity.school

  return (
    <Link
      href={
        school
          ? `/dashboard/leads/${school.id}`
          : '/dashboard'
      }
      className="follow-up-row"
    >
      <div className="follow-up-icon">
        {activity.activity_type === 'call'
          ? '☎'
          : activity.activity_type === 'email'
            ? '✉'
            : '↗'}
      </div>

      <div className="follow-up-content">
        <div className="follow-up-top">
          <strong>
            {school?.school_name ?? 'Unknown school'}
          </strong>

          {school?.priority && (
            <span className="status-pill">
              {school.priority}
            </span>
          )}
        </div>

        <span className="muted">
          {activity.subject || activity.activity_type}
        </span>

        {activity.body && (
          <p>{activity.body}</p>
        )}

        <small>
          {new Date(activity.created_at).toLocaleString('en-NG', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </small>
      </div>

      {school?.lead_score !== null &&
        school?.lead_score !== undefined && (
          <div className="lead-score">
            <strong>{school.lead_score}</strong>
            <span>score</span>
          </div>
        )}
    </Link>
  )
}