'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Location = {
  id: string
  name: string
  type: string
  parent_id: string | null
}

type Lead = {
  id: string
  school_name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  lead_score: number | null
  priority: string | null
  status: string
  school_type: string | null
  state_id: string | null
  lga_id: string | null
  city_id: string | null
  area_id: string | null
  is_lead: boolean
  lead_marked_at: string | null
  scheduled_for: string | null
  scheduled_note: string | null
  last_activity: any
  next_visit: any
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

export default function LeadsPage() {
  const [locations, setLocations] =
    useState<Location[]>([])

  const [leads, setLeads] =
    useState<Lead[]>([])

  const [stateId, setStateId] =
    useState('')

  const [lgaId, setLgaId] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState('ALL')

  const [loading, setLoading] =
    useState(true)

  const [message, setMessage] =
    useState('')

  const [followUpLead, setFollowUpLead] =
    useState<Lead | null>(null)

  const [visitLead, setVisitLead] =
    useState<Lead | null>(null)

  async function loadLeads() {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (stateId)
        params.set('state_id', stateId)

      if (lgaId)
        params.set('lga_id', lgaId)

      if (
        statusFilter !== 'ALL'
      ) {
        params.set(
          'status',
          statusFilter
        )
      }

      const response = await fetch(
        `/api/leads?${params.toString()}`,
        {
          cache: 'no-store',
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to load leads'
        )
      }

      setLeads(data.leads || [])
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load leads'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/locations')
      .then(r => r.json())
      .then(d =>
        setLocations(
          d.locations || []
        )
      )
  }, [])

  useEffect(() => {
    loadLeads()
  }, [
    stateId,
    lgaId,
    statusFilter,
  ])

  const states = locations.filter(
    x => x.type === 'state'
  )

  const lgas = locations.filter(
    x =>
      x.type === 'lga' &&
      x.parent_id === stateId
  )

  const counts = useMemo(() => {
    const result: Record<string, number> =
      {}

    for (const lead of leads) {
      result[lead.status] =
        (result[lead.status] || 0) + 1
    }

    return result
  }, [leads])

  function stateName(id: string | null) {
    return (
      locations.find(
        x => x.id === id
      )?.name || ''
    )
  }

  function lgaName(id: string | null) {
    return (
      locations.find(
        x => x.id === id
      )?.name || ''
    )
  }

  return (
    <main className="dashboard-page">
      <header className="lead-detail-head">
        <div>
          <p className="eyebrow">
            SALES PIPELINE
          </p>

          <h1>Leads</h1>

          <p className="muted">
            Every school here has been
            deliberately promoted into
            the sales pipeline.
          </p>
        </div>

        <Link
          href="/dashboard/discover"
          className="button"
        >
          Discover schools
        </Link>
      </header>

      <section className="card">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(110px,1fr))',
            gap: 10,
          }}
        >
          <PipelineStat
            label="All leads"
            value={leads.length}
          />

          {statuses.map(status => (
            <PipelineStat
              key={status}
              label={status.replaceAll(
                '_',
                ' '
              )}
              value={counts[status] || 0}
            />
          ))}
        </div>
      </section>

      <section
        className="card"
        style={{ marginTop: 18 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
          }}
        >
          <label>
            <span>State</span>

            <select
              value={stateId}
              onChange={e => {
                setStateId(
                  e.target.value
                )
                setLgaId('')
              }}
            >
              <option value="">
                All states
              </option>

              {states.map(state => (
                <option
                  key={state.id}
                  value={state.id}
                >
                  {state.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>LGA</span>

            <select
              value={lgaId}
              disabled={!stateId}
              onChange={e =>
                setLgaId(
                  e.target.value
                )
              }
            >
              <option value="">
                All LGAs
              </option>

              {lgas.map(lga => (
                <option
                  key={lga.id}
                  value={lga.id}
                >
                  {lga.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Status</span>

            <select
              value={statusFilter}
              onChange={e =>
                setStatusFilter(
                  e.target.value
                )
              }
            >
              <option value="ALL">
                All statuses
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
          </label>
        </div>
      </section>

      {message && (
        <div
          className="discovery-message"
          style={{ marginTop: 15 }}
        >
          {message}
        </div>
      )}

      <section
        className="card"
        style={{ marginTop: 18 }}
      >
        <div className="row">
          <div>
            <p className="eyebrow">
              ACTIVE PIPELINE
            </p>

            <h2>
              {leads.length} leads
            </h2>
          </div>
        </div>

        {loading ? (
          <p className="muted">
            Loading pipeline…
          </p>
        ) : leads.length === 0 ? (
          <div className="empty-results">
            No leads match these filters.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 12,
              marginTop: 15,
            }}
          >
            {leads.map(lead => (
              <article
                key={lead.id}
                style={{
                  border:
                    '1px solid var(--border, #ddd)',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 15,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                    >
                      <strong
                        style={{
                          fontSize: 17,
                        }}
                      >
                        {lead.school_name}
                      </strong>
                    </Link>

                    <div className="muted">
                      {[
                        lgaName(
                          lead.lga_id
                        ),
                        stateName(
                          lead.state_id
                        ),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>

                  <div>
                    <Status
                      status={
                        lead.status
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit,minmax(180px,1fr))',
                    gap: 10,
                    marginTop: 15,
                  }}
                >
                  <Info
                    label="Phone"
                    value={
                      lead.phone ||
                      'No phone'
                    }
                  />

                  <Info
                    label="Priority"
                    value={
                      lead.priority ||
                      '—'
                    }
                  />

                  <Info
                    label="Last action"
                    value={
                      lead.last_activity
                        ?.outcome ||
                      lead.last_activity
                        ?.activity_type ||
                      'No activity'
                    }
                  />

                  <Info
                    label="Next visit"
                    value={
                      lead.next_visit
                        ?.scheduled_for
                        ? new Date(
                            lead.next_visit
                              .scheduled_for
                          ).toLocaleString()
                        : 'None'
                    }
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginTop: 15,
                  }}
                >
                  <button
                    className="button"
                    onClick={() =>
                      setFollowUpLead(
                        lead
                      )
                    }
                  >
                    + Follow Up
                  </button>

                  <button
                    className="button"
                    onClick={() =>
                      setVisitLead(
                        lead
                      )
                    }
                  >
                    + Schedule Visit
                  </button>

                  <select
                    value={lead.status}
                    onChange={async e => {
                      await changeStatus(
                        lead.id,
                        e.target.value
                      )

                      loadLeads()
                    }}
                  >
                    {statuses.map(
                      status => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status.replaceAll(
                            '_',
                            ' '
                          )}
                        </option>
                      )
                    )}
                  </select>

                  <Link
                    className="view-link"
                    href={`dashboard/leads/${lead.id}`}
                  >
                    Open lead →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {followUpLead && (
        <FollowUpModal
          lead={followUpLead}
          onClose={() =>
            setFollowUpLead(null)
          }
          onSaved={() => {
            setFollowUpLead(null)
            loadLeads()
          }}
        />
      )}

      {visitLead && (
        <VisitModal
          lead={visitLead}
          onClose={() =>
            setVisitLead(null)
          }
          onSaved={() => {
            setVisitLead(null)
            loadLeads()
          }}
        />
      )}
    </main>
  )
}

async function changeStatus(
  id: string,
  status: string
) {
  const response = await fetch(
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

  if (!response.ok) {
    const data =
      await response.json()

    alert(
      data.error ||
        'Failed to update status'
    )
  }
}

function FollowUpModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead
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
    if (!note.trim()) {
      alert('Add a follow-up note.')
      return
    }

    setSaving(true)

    const response = await fetch(
      `/api/leads/${lead.id}/actions`,
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
          'Failed to save follow-up'
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
          value={note}
          onChange={e =>
            setNote(e.target.value)
          }
          placeholder="What needs to happen?"
          rows={4}
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
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead
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
        'Choose a visit date and time.'
      )
      return
    }

    setSaving(true)

    const response = await fetch(
      `/api/leads/${lead.id}/actions`,
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
    <Modal title="Schedule school visit">
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
        <span>Contact person</span>

        <input
          value={contact}
          onChange={e =>
            setContact(e.target.value)
          }
          placeholder="School administrator"
        />
      </label>

      <label>
        <span>Notes</span>

        <textarea
          value={notes}
          onChange={e =>
            setNotes(e.target.value)
          }
          placeholder="Purpose of visit"
          rows={4}
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
            gap: 15,
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
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}

function PipelineStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div>
      <strong
        style={{
          fontSize: 22,
        }}
      >
        {value}
      </strong>

      <div className="muted">
        {label}
      </div>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <small className="muted">
        {label}
      </small>

      <div>{value}</div>
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
      {status.replaceAll(
        '_',
        ' '
      )}
    </span>
  )
}