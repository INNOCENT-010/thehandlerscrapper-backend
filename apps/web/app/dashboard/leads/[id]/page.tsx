'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type School = {
  id: string
  school_name: string
  address: string | null
  city: string | null
  state: string | null
  website: string | null
  phone: string | null
  email: string | null
  lead_score: number
  is_lead:boolean;
  priority: string
  status: string
  school_type: string | null
  levels: string[]
  existing_software: string | null
  has_online_registration: boolean | null
  has_online_payment: boolean | null
  notes: string | null
}

type Contact = {
  id: string
  full_name: string | null
  role: string | null
  email: string | null
  phone: string | null
  contact_type: string
}

type Signal = {
  id: string
  code: string
  points: number
  detail: string | null
}

type Activity = {
  id: string
  activity_type: string
  outcome: string | null
  note: string | null
  occurred_at: string
  scheduled_for: string | null
}

type Visit = {
  id: string
  scheduled_for: string
  completed_at: string | null
  contact_name: string | null
  outcome: string | null
  notes: string | null
}

const statuses = [
  'CONTACTED',
  'INTERESTED',
  'SCHEDULED',
  'VISITED',
  'DEMO',
  'NEGOTIATION',
  'CUSTOMER',
  'NOT_INTERESTED',
  'LOST',
  'DO_NOT_CONTACT',
]

export default function LeadDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [id, setId] =
    useState('')

  const [school, setSchool] =
    useState<School | null>(null)

  const [contacts, setContacts] =
    useState<Contact[]>([])

  const [signals, setSignals] =
    useState<Signal[]>([])

  const [activities, setActivities] =
    useState<Activity[]>([])

  const [visits, setVisits] =
    useState<Visit[]>([])

  const [loading, setLoading] =
    useState(true)

  const [followUpOpen, setFollowUpOpen] =
    useState(false)

  const [visitOpen, setVisitOpen] =
    useState(false)

  useEffect(() => {
    params.then(p =>
      setId(p.id)
    )
  }, [params])

  async function load() {
    if (!id) return

    setLoading(true)

    const response = await fetch(
      `/api/leads/${id}`,
      {
        cache: 'no-store',
      }
    )

    const data =
      await response.json()

    if (response.ok) {
      setSchool(data.school)
      setContacts(
        data.contacts || []
      )
      setSignals(
        data.signals || []
      )
      setActivities(
        data.activities || []
      )
      setVisits(
        data.visits || []
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function markLead() {
    await fetch(
      `/api/leads/${id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          action: 'lead',
        }),
      }
    )

    load()
  }

  async function changeStatus(
    status: string
  ) {
    await fetch(
      `/api/leads/${id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          action: 'status',
          status,
        }),
      }
    )

    load()
  }

  async function completeVisit(
    visit: Visit
  ) {
    const notes =
      window.prompt(
        'Visit notes:',
        visit.notes || ''
      )

    await fetch(
      `/api/leads/${id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          action: 'complete_visit',
          visit_id: visit.id,
          outcome:
            'completed',
          notes,
        }),
      }
    )

    load()
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <Link href="/leads">
          ← Leads
        </Link>

        <div className="loading">
          Loading lead…
        </div>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="dashboard-page">
        <Link href="/leads">
          ← Leads
        </Link>

        <p>
          Lead not found.
        </p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <Link
        className="back"
        href="/leads"
      >
        ← All leads
      </Link>

      <header className="lead-detail-head">
        <div>
          <p className="eyebrow">
            SCHOOL PROSPECT
          </p>

          <h1>
            {school.school_name}
          </h1>

          <p className="muted">
            {school.address ||
              [
                school.city,
                school.state,
              ]
                .filter(Boolean)
                .join(', ')}
          </p>
        </div>

        <div className="big-score">
          <strong>
            {school.lead_score}
          </strong>

          <span>
            {school.priority}
          </span>
        </div>
      </header>

      <section
        className="card"
        style={{
          marginTop: 18,
        }}
      >
        <p className="eyebrow">
          SALES CONTROL
        </p>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems:
              'center',
          }}
        >
          {!school.is_lead && (
            <button
              className="button"
              onClick={markLead}
            >
              + Mark as Lead
            </button>
          )}

          <select
            value={school.status}
            onChange={e =>
              changeStatus(
                e.target.value
              )
            }
          >
            <option value="NEW">
              NEW
            </option>

            {statuses.map(status => (
              <option
                key={status}
                value={status}
              >
                {status.replaceAll(
                  '_',
                  ' '
                )}
              </option>
            ))}
          </select>

          <button
            className="button"
            onClick={() =>
              setFollowUpOpen(true)
            }
          >
            + Follow Up
          </button>

          <button
            className="button"
            onClick={() =>
              setVisitOpen(true)
            }
          >
            + Schedule Visit
          </button>
        </div>
      </section>

      <div className="detail-grid">
        <section className="card">
          <p className="eyebrow">
            INTELLIGENCE
          </p>

          <div className="facts">
            <Fact
              label="Type"
              value={
                school.school_type
              }
            />

            <Fact
              label="Levels"
              value={school.levels?.join(
                ', '
              )}
            />

            <Fact
              label="Phone"
              value={school.phone}
            />

            <Fact
              label="Email"
              value={school.email}
            />

            <Fact
              label="Website"
              value={
                school.website
              }
            />

            <Fact
              label="Existing software"
              value={
                school.existing_software
              }
            />

            <Fact
              label="Online registration"
              value={
                school.has_online_registration
                  ? 'Detected'
                  : 'Not detected'
              }
            />

            <Fact
              label="Online payment"
              value={
                school.has_online_payment
                  ? 'Detected'
                  : 'Not detected'
              }
            />
          </div>
        </section>

        <section className="card">
          <p className="eyebrow">
            CONTACTS
          </p>

          {contacts.length ? (
            contacts.map(c => (
              <div
                className="contact-row"
                key={c.id}
              >
                <b>
                  {c.full_name ||
                    c.email ||
                    c.phone ||
                    'Unnamed contact'}
                </b>

                <span>
                  {c.role ||
                    c.contact_type}
                </span>
              </div>
            ))
          ) : (
            <p className="muted">
              No additional contacts
              found yet.
            </p>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">
            NEXT VISITS
          </p>

          {visits.length ? (
            visits.map(visit => (
              <div
                key={visit.id}
                style={{
                  padding:
                    '12px 0',
                  borderBottom:
                    '1px solid var(--border,#ddd)',
                }}
              >
                <b>
                  {new Date(
                    visit.scheduled_for
                  ).toLocaleString()}
                </b>

                <div className="muted">
                  {visit.contact_name ||
                    'No contact specified'}
                </div>

                <div>
                  {visit.notes ||
                    'No notes'}
                </div>

                {!visit.completed_at && (
                  <button
                    style={{
                      marginTop: 8,
                    }}
                    onClick={() =>
                      completeVisit(
                        visit
                      )
                    }
                  >
                    Mark visited
                  </button>
                )}

                {visit.completed_at && (
                  <small>
                    Completed
                  </small>
                )}
              </div>
            ))
          ) : (
            <p className="muted">
              No visits scheduled.
            </p>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">
            ACTIVITY
          </p>

          {activities.length ? (
            activities.map(
              activity => (
                <div
                  key={
                    activity.id
                  }
                  style={{
                    padding:
                      '12px 0',
                    borderBottom:
                      '1px solid var(--border,#ddd)',
                  }}
                >
                  <b>
                    {activity.activity_type
                      ?.replaceAll(
                        '_',
                        ' '
                      )}
                  </b>

                  <span>
                    {' '}
                    ·{' '}
                    {activity.outcome ||
                      ''}
                  </span>

                  <div>
                    {activity.note ||
                      'No note'}
                  </div>

                  <small className="muted">
                    {new Date(
                      activity.occurred_at
                    ).toLocaleString()}
                  </small>
                </div>
              )
            )
          ) : (
            <p className="muted">
              No sales activity yet.
            </p>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">
            WHY THIS SCORE
          </p>

          {signals.length ? (
            signals.map(s => (
              <div
                className="signal"
                key={s.id}
              >
                <b>
                  +{s.points}
                </b>

                <span>
                  {s.detail ||
                    s.code}
                </span>
              </div>
            ))
          ) : (
            <p className="muted">
              No signal details yet.
            </p>
          )}
        </section>
      </div>

      {followUpOpen && (
        <FollowUpModal
          id={id}
          onClose={() =>
            setFollowUpOpen(false)
          }
          onSaved={() => {
            setFollowUpOpen(false)
            load()
          }}
        />
      )}

      {visitOpen && (
        <VisitModal
          id={id}
          onClose={() =>
            setVisitOpen(false)
          }
          onSaved={() => {
            setVisitOpen(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function FollowUpModal({
  id,
  onClose,
  onSaved,
}: {
  id: string
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] =
    useState('call')

  const [date, setDate] =
    useState('')

  const [note, setNote] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  async function save() {
    setSaving(true)

    const response = await fetch(
      `/api/leads/${id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          action: 'follow_up',
          activity_type: type,
          note,
          scheduled_for:
            date
              ? new Date(date).toISOString()
              : null,
        }),
      }
    )

    setSaving(false)

    if (!response.ok) {
      const data =
        await response.json()

      alert(
        data.error ||
          'Failed to save'
      )

      return
    }

    onSaved()
  }

  return (
    <Modal title="Add follow-up">
      <label>
        <span>Method</span>

        <select
          value={type}
          onChange={e =>
            setType(e.target.value)
          }
        >
          <option value="call">
            Call
          </option>

          <option value="message">
            Message
          </option>

          <option value="email">
            Email
          </option>

          <option value="whatsapp">
            WhatsApp
          </option>
        </select>
      </label>

      <label>
        <span>Follow-up date</span>

        <input
          type="datetime-local"
          value={date}
          onChange={e =>
            setDate(e.target.value)
          }
        />
      </label>

      <label>
        <span>Note</span>

        <textarea
          rows={4}
          value={note}
          onChange={e =>
            setNote(e.target.value)
          }
        />
      </label>

      <ModalButtons
        onClose={onClose}
        onSave={save}
        saving={saving}
        label="Save follow-up"
      />
    </Modal>
  )
}

function VisitModal({
  id,
  onClose,
  onSaved,
}: {
  id: string
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] =
    useState('')

  const [contact, setContact] =
    useState('')

  const [notes, setNotes] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  async function save() {
    if (!date) {
      alert(
        'Choose a date and time.'
      )
      return
    }

    setSaving(true)

    const response = await fetch(
      `/api/leads/${id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          action: 'visit',
          scheduled_for:
            new Date(
              date
            ).toISOString(),
          contact_name:
            contact || null,
          notes:
            notes ||
            'Sales visit scheduled.',
        }),
      }
    )

    setSaving(false)

    if (!response.ok) {
      const data =
        await response.json()

      alert(
        data.error ||
          'Failed to schedule visit'
      )

      return
    }

    onSaved()
  }

  return (
    <Modal title="Schedule visit">
      <label>
        <span>Date & time</span>

        <input
          type="datetime-local"
          value={date}
          onChange={e =>
            setDate(e.target.value)
          }
        />
      </label>

      <label>
        <span>Contact</span>

        <input
          value={contact}
          onChange={e =>
            setContact(e.target.value)
          }
        />
      </label>

      <label>
        <span>Notes</span>

        <textarea
          rows={4}
          value={notes}
          onChange={e =>
            setNotes(e.target.value)
          }
        />
      </label>

      <ModalButtons
        onClose={onClose}
        onSave={save}
        saving={saving}
        label="Schedule visit"
      />
    </Modal>
  )
}

function Modal({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background:
          'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent:
          'center',
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 500,
        }}
      >
        <h2>{title}</h2>

        <div
          style={{
            display: 'grid',
            gap: 14,
            marginTop: 15,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function ModalButtons({
  onClose,
  onSave,
  saving,
  label,
}: {
  onClose: () => void
  onSave: () => void
  saving: boolean
  label: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent:
          'flex-end',
        gap: 8,
      }}
    >
      <button onClick={onClose}>
        Cancel
      </button>

      <button
        className="button"
        onClick={onSave}
        disabled={saving}
      >
        {saving
          ? 'Saving…'
          : label}
      </button>
    </div>
  )
}

function Fact({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <span>{label}</span>
      <b>{value || '—'}</b>
    </div>
  )
}