'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import '../discover.css'
import { useParams, useRouter } from 'next/navigation'

type School = {
  id: string
  school_name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  school_type: string | null
  levels: string[] | null
  student_estimate: number | null
  has_online_registration: boolean | null
  has_online_payment: boolean | null
  existing_software: string | null
  lead_score: number | null
  priority: string | null
  status: string
  source: string | null
  source_url: string | null
  latitude: number | null
  longitude: number | null
  first_seen_at: string | null
  last_enriched_at: string | null
  notes: string | null
  scheduled_for: string | null
  scheduled_note: string | null

  school_contacts?: Array<{
    id: string
    email?: string | null
    phone?: string | null
    contact_name?: string | null
    contact_type?: string | null
    role?: string | null
  }>

  school_pages?: Array<{
    id: string
    url: string
    title?: string | null
    page_type?: string | null
  }>

  lead_signals?: Array<{
    id: string
    signal_type?: string | null
    signal_value?: string | null
    source_url?: string | null
    created_at?: string
  }>
}

export default function SchoolDiscoveryPage() {
  const params = useParams()
  const router = useRouter()

  const id = params.id as string

  const [school, setSchool] =
    useState<School | null>(null)

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSchool()
  }, [id])

  async function loadSchool() {
    try {
      const response = await fetch(
        `/api/discover/${id}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'School not found'
        )
      }

      setSchool(data.school)

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load school'
      )
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(
    status: string
  ) {
    if (!school) return

    setSaving(true)

    try {
      const response = await fetch(
        `/api/discover/${id}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            status,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to update'
        )
      }

      setSchool(data.school)

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Update failed'
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteSchool() {
    if (
      !window.confirm(
        'Delete this school lead? This cannot be undone.'
      )
    ) {
      return
    }

    const response = await fetch(
      `/api/discover/${id}`,
      {
        method: 'DELETE',
      }
    )

    if (response.ok) {
      router.push('/dashboard/discover')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <main className="school-detail-shell">
        <div className="detail-loading">
          Loading school…
        </div>
      </main>
    )
  }

  if (!school) {
    return (
      <main className="school-detail-shell">
        <Link href="/dashboard/discover">
          ← Back to discovery
        </Link>

        <div className="detail-error">
          {message || 'School not found.'}
        </div>
      </main>
    )
  }

  return (
    <main className="school-detail-shell">

      <Link
        href="/dashboard/discover"
        className="back-link"
      >
        ← Back to discovery
      </Link>

      <header className="school-hero">

        <div>

          <div className="eyebrow">
            SCHOOL LEAD
          </div>

          <h1>
            {school.school_name}
          </h1>

          <p className="hero-address">
            {school.address ||
              'Address unavailable'}
          </p>

          <div className="hero-badges">

            <Status
              status={school.status}
            />

            <span
              className={`priority priority-${school.priority}`}
            >
              {school.priority || 'unscored'}
              priority
            </span>

          </div>

        </div>

        <div className="hero-score">

          <strong>
            {school.lead_score ?? 0}
          </strong>

          <span>
            LEAD SCORE
          </span>

        </div>

      </header>

      <div className="detail-actions">

        <button
          onClick={() =>
            updateStatus('CONTACTED')
          }
          disabled={saving}
        >
          Contacted
        </button>

        <button
          onClick={() =>
            updateStatus('INTERESTED')
          }
          disabled={saving}
        >
          Interested
        </button>

        <button
          onClick={() =>
            updateStatus('SCHEDULED')
          }
          disabled={saving}
        >
          Schedule
        </button>

        <button
          onClick={() =>
            updateStatus('VISITED')
          }
          disabled={saving}
        >
          Visited
        </button>

        <button
          onClick={() =>
            updateStatus('DEMO')
          }
          disabled={saving}
        >
          Demo
        </button>

        <button
          onClick={() =>
            updateStatus('CUSTOMER')
          }
          disabled={saving}
        >
          Customer
        </button>

        <button
          className="danger-button"
          onClick={deleteSchool}
        >
          Delete
        </button>

      </div>

      {message && (
        <div className="detail-message">
          {message}
        </div>
      )}

      <div className="detail-grid">

        <section className="detail-card">

          <SectionTitle>
            Contact
          </SectionTitle>

          <InfoRow
            label="Phone"
            value={
              school.phone || 'Not found'
            }
          />

          <InfoRow
            label="Email"
            value={
              school.email || 'Not found'
            }
          />

          <InfoRow
            label="Website"
            value={
              school.website
                ? (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {school.website} ↗
                  </a>
                )
                : 'Not found'
            }
          />

          {school.school_contacts?.map(
            contact => (
              <div
                className="contact-record"
                key={contact.id}
              >
                <strong>
                  {contact.contact_name ||
                    contact.email ||
                    contact.phone ||
                    'Contact'}
                </strong>

                <span>
                  {contact.role ||
                    contact.contact_type ||
                    ''}
                </span>

                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                  >
                    {contact.email}
                  </a>
                )}
              </div>
            )
          )}

        </section>

        <section className="detail-card">

          <SectionTitle>
            School profile
          </SectionTitle>

          <InfoRow
            label="Type"
            value={
              school.school_type ||
              'Unknown'
            }
          />

          <InfoRow
            label="Levels"
            value={
              school.levels?.join(', ') ||
              'Not available'
            }
          />

          <InfoRow
            label="Estimated students"
            value={
              school.student_estimate ??
              'Not available'
            }
          />

          <InfoRow
            label="Existing software"
            value={
              school.existing_software ||
              'Not detected'
            }
          />

        </section>

        <section className="detail-card">

          <SectionTitle>
            Digital signals
          </SectionTitle>

          <Signal
            label="Website"
            active={!!school.website}
          />

          <Signal
            label="Online registration"
            active={
              !!school.has_online_registration
            }
          />

          <Signal
            label="Online payment"
            active={
              !!school.has_online_payment
            }
          />

        </section>

        <section className="detail-card">

          <SectionTitle>
            Location
          </SectionTitle>

          <InfoRow
            label="Address"
            value={
              school.address ||
              'Not available'
            }
          />

          <InfoRow
            label="Latitude"
            value={
              school.latitude ??
              'Not available'
            }
          />

          <InfoRow
            label="Longitude"
            value={
              school.longitude ??
              'Not available'
            }
          />

          {school.latitude &&
            school.longitude && (
              <a
                className="map-link"
                href={`https://www.google.com/maps/search/?api=1&query=${school.latitude},${school.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps ↗
              </a>
            )}

        </section>

      </div>

      <section className="detail-card full-card">

        <SectionTitle>
          Lead signals
        </SectionTitle>

        {school.lead_signals?.length ? (
          <div className="signal-list">

            {school.lead_signals.map(
              signal => (
                <div
                  className="signal-row"
                  key={signal.id}
                >
                  <strong>
                    {signal.signal_type}
                  </strong>

                  <span>
                    {signal.signal_value}
                  </span>

                  {signal.source_url && (
                    <a
                      href={signal.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              )
            )}

          </div>
        ) : (
          <p className="muted">
            No lead signals recorded yet.
          </p>
        )}

      </section>

      <section className="detail-card full-card">

        <SectionTitle>
          Crawled pages
        </SectionTitle>

        {school.school_pages?.length ? (
          <div className="page-list">

            {school.school_pages.map(
              page => (
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                  key={page.id}
                >
                  <strong>
                    {page.title ||
                      page.page_type ||
                      page.url}
                  </strong>

                  <span>
                    {page.url}
                  </span>
                </a>
              )
            )}

          </div>
        ) : (
          <p className="muted">
            No crawled pages recorded.
          </p>
        )}

      </section>

      <section className="detail-card full-card">

        <SectionTitle>
          Discovery history
        </SectionTitle>

        <InfoRow
          label="Source"
          value={
            school.source ||
            'Google Places'
          }
        />

        <InfoRow
          label="First discovered"
          value={
            formatDate(
              school.first_seen_at
            )
          }
        />

        <InfoRow
          label="Last enriched"
          value={
            formatDate(
              school.last_enriched_at
            )
          }
        />

      </section>

      <section className="detail-card full-card danger-zone">

        <SectionTitle>
          Danger zone
        </SectionTitle>

        <p>
          Permanently remove this school
          from the lead engine.
        </p>

        <button
          className="danger-button"
          onClick={deleteSchool}
        >
          Delete school
        </button>

      </section>

    </main>
  )
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="section-title">
      {children}
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Signal({
  label,
  active,
}: {
  label: string
  active: boolean
}) {
  return (
    <div className="signal-check">
      <span>
        {active ? '✓' : '—'}
      </span>

      <strong>
        {label}
      </strong>
    </div>
  )
}

function Status({
  status,
}: {
  status: string
}) {
  return (
    <span
      className={`status status-${status.toLowerCase()}`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  )
}

function formatDate(
  value: string | null
) {
  if (!value) return 'Not available'

  return new Date(value).toLocaleString()
}