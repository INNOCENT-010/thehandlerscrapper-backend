'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Location = {
  id: string
  name: string
}

type School = {
  id: string
  school_name: string
  email: string | null
  phone: string | null
  address: string | null
  state: string | null
  lga: string | null
  city: string | null
  area: string | null
  is_lead: boolean
  status: string
  priority: string | null
  discovery_count: number
  last_discovery_at: string | null
  is_fresh: boolean
}

type Audience = {
  schools: School[]
  total: number
  email_count: number
  phone_count: number
  lead_count: number
  fresh_count: number
}

type Broadcast = {
  id: string
  subject: string
  sender_name: string
  status: string
  recipient_count: number
  sent_count: number
  failed_count: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

const STATUSES = [
  'NEW',
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

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function statusClasses(status: string) {
  switch (status) {
    case 'CUSTOMER':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'INTERESTED':
    case 'DEMO':
    case 'NEGOTIATION':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'CONTACTED':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'SCHEDULED':
    case 'VISITED':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'DO_NOT_CONTACT':
    case 'NOT_INTERESTED':
    case 'LOST':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function broadcastStatusClasses(status: string) {
  switch (status) {
    case 'SENT':
      return 'bg-emerald-50 text-emerald-700'
    case 'SENDING':
      return 'bg-blue-50 text-blue-700'
    case 'PARTIAL':
      return 'bg-amber-50 text-amber-700'
    case 'FAILED':
      return 'bg-red-50 text-red-700'
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-500'
    default:
      return 'bg-violet-50 text-violet-700'
  }
}

export default function DistributionPage() {
  const [states, setStates] = useState<Location[]>([])
  const [lgas, setLgas] = useState<Location[]>([])
  const [cities, setCities] = useState<Location[]>([])

  const [stateId, setStateId] = useState('')
  const [lgaId, setLgaId] = useState('')
  const [cityId, setCityId] = useState('')

  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const [leadOnly, setLeadOnly] = useState(false)
  const [hasEmail, setHasEmail] = useState(true)
  const [hasPhone, setHasPhone] = useState(false)
  const [freshOnly, setFreshOnly] = useState(false)

  const [audience, setAudience] = useState<Audience>({
    schools: [],
    total: 0,
    email_count: 0,
    phone_count: 0,
    lead_count: 0,
    fresh_count: 0,
  })

  const [selected, setSelected] =
    useState<Set<string>>(new Set())

  const [subject, setSubject] = useState('')
  const [senderName, setSenderName] =
    useState('TheHandler')

  const [body, setBody] = useState(
    '<h2>Hello {{school_name}},</h2><p>We would like to introduce TheHandler to your school.</p><p>Regards,<br>TheHandler Team</p>'
  )

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const [history, setHistory] =
    useState<Broadcast[]>([])

  const [tab, setTab] = useState<
    'audience' | 'composer' | 'history'
  >('audience')

  const query = useMemo(() => {
    const params = new URLSearchParams()

    if (stateId) params.set('state_id', stateId)
    if (lgaId) params.set('lga_id', lgaId)
    if (cityId) params.set('city_id', cityId)

    if (status) params.set('status', status)

    if (leadOnly) params.set('lead_only', 'true')
    if (hasEmail) params.set('has_email', 'true')
    if (hasPhone) params.set('has_phone', 'true')
    if (freshOnly) params.set('fresh_only', 'true')

    if (search.trim()) {
      params.set('search', search.trim())
    }

    return params.toString()
  }, [
    stateId,
    lgaId,
    cityId,
    status,
    leadOnly,
    hasEmail,
    hasPhone,
    freshOnly,
    search,
  ])

  const loadAudience = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch(
        `/api/distribution/audience?${query}`,
        {
          cache: 'no-store',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load audience'
        )
      }

      setAudience(data)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load audience'
      )
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetch('/api/locations?type=state')
      .then((response) => response.json())
      .then((data) => {
        setStates(data.locations || data || [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLgaId('')
    setCityId('')
    setLgas([])
    setCities([])

    if (!stateId) return

    fetch(
      `/api/locations?type=lga&parent_id=${stateId}`
    )
      .then((response) => response.json())
      .then((data) => {
        setLgas(data.locations || data || [])
      })
      .catch(() => {})
  }, [stateId])

  useEffect(() => {
    setCityId('')
    setCities([])

    if (!lgaId) return

    fetch(
      `/api/locations?type=city&parent_id=${lgaId}`
    )
      .then((response) => response.json())
      .then((data) => {
        setCities(data.locations || data || [])
      })
      .catch(() => {})
  }, [lgaId])

  useEffect(() => {
    const timer = setTimeout(
      loadAudience,
      250
    )

    return () => clearTimeout(timer)
  }, [loadAudience])

  useEffect(() => {
    setSelected((current) => {
      const visible = new Set(
        audience.schools.map(
          (school) => school.id
        )
      )

      return new Set(
        [...current].filter((id) =>
          visible.has(id)
        )
      )
    })
  }, [audience.schools])

  const selectedSchools = audience.schools.filter(
    (school) =>
      selected.has(school.id)
  )

  const allSelected =
    audience.schools.length > 0 &&
    audience.schools.every((school) =>
      selected.has(school.id)
    )

  const selectedEmailCount =
    selectedSchools.filter(
      (school) => Boolean(school.email)
    ).length

  const selectedLeadCount =
    selectedSchools.filter(
      (school) => school.is_lead
    ).length

  function toggleSchool(id: string) {
    setSelected((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  function toggleAll() {
    setSelected((current) => {
      if (allSelected) {
        return new Set()
      }

      return new Set(
        audience.schools.map(
          (school) => school.id
        )
      )
    })
  }

  function clearFilters() {
    setStateId('')
    setLgaId('')
    setCityId('')
    setStatus('')
    setSearch('')

    setLeadOnly(false)
    setHasEmail(true)
    setHasPhone(false)
    setFreshOnly(false)

    setSelected(new Set())
  }

  async function loadHistory() {
    try {
      const response = await fetch(
        '/api/distribution/history',
        {
          cache: 'no-store',
        }
      )

      const data = await response.json()

      if (response.ok) {
        setHistory(data.broadcasts || [])
      }
    } catch {}
  }

  async function queueBroadcast() {
    if (!selected.size) {
      setMessage(
        'Select at least one recipient.'
      )
      return
    }

    if (!subject.trim()) {
      setMessage(
        'Enter a campaign subject.'
      )
      return
    }

    if (!body.trim()) {
      setMessage(
        'Enter an email message.'
      )
      return
    }

    const blocked = selectedSchools.filter(
      (school) =>
        school.status === 'DO_NOT_CONTACT'
    )

    if (blocked.length) {
      setMessage(
        'Remove DO_NOT_CONTACT schools from the selection before sending.'
      )
      return
    }

    const confirmed = window.confirm(
      `Queue this broadcast for ${selected.size} selected schools?`
    )

    if (!confirmed) return

    setSending(true)
    setMessage('Creating broadcast…')

    try {
      const response = await fetch(
        '/api/distribution/broadcast',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            school_ids: [
              ...selected,
            ],
            subject:
              subject.trim(),
            body_html: body,
            sender_name:
              senderName.trim() ||
              'TheHandler',
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to queue broadcast'
        )
      }

      setMessage(
        `Broadcast queued for ${data.recipient_count} recipients.`
      )

      setSelected(new Set())

      await loadHistory()

      setTab('history')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to queue broadcast'
      )
    } finally {
      setSending(false)
    }
  }

  const activeFilterCount =
    [
      stateId,
      lgaId,
      cityId,
      status,
      search.trim(),
    ].filter(Boolean).length +
    [
      leadOnly,
      hasEmail,
      hasPhone,
      freshOnly,
    ].filter(Boolean).length

  const previewBody = body
    .replaceAll(
      '{{school_name}}',
      selectedSchools[0]?.school_name ||
        'School Name'
    )
    .replaceAll(
      '{{status}}',
      selectedSchools[0]?.status ||
        'NEW'
    )

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <div className="mx-auto max-w-[1700px] p-4 sm:p-6 lg:p-8">

        {/* HEADER */}

        <header className="mb-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-6 sm:px-7">

            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                    THEHANDLER
                  </span>

                  <span className="text-xs text-slate-400">
                    Marketing
                  </span>
                </div>

                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Distribution
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Turn your school database into targeted
                  audiences and campaigns.
                </p>
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1">

                <button
                  onClick={() =>
                    setTab('audience')
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    tab === 'audience'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Audience
                </button>

                <button
                  onClick={() =>
                    setTab('composer')
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    tab === 'composer'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Broadcast

                  {selected.size > 0 && (
                    <span className="ml-2 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">
                      {selected.size}
                    </span>
                  )}
                </button>

                <button
                  onClick={async () => {
                    await loadHistory()
                    setTab('history')
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    tab === 'history'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  History
                </button>

              </div>

            </div>

          </div>

          {/* METRICS */}

          <div className="grid grid-cols-2 divide-x divide-y border-slate-100 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">

            <div className="px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Audience
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {audience.total.toLocaleString()}
              </div>

              <div className="mt-0.5 text-xs text-slate-400">
                schools
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Reachable
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {audience.email_count.toLocaleString()}
              </div>

              <div className="mt-0.5 text-xs text-slate-400">
                email addresses
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Leads
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {audience.lead_count.toLocaleString()}
              </div>

              <div className="mt-0.5 text-xs text-slate-400">
                active opportunities
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Fresh
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {audience.fresh_count.toLocaleString()}
              </div>

              <div className="mt-0.5 text-xs text-slate-400">
                recently discovered
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Selected
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {selected.size.toLocaleString()}
              </div>

              <div className="mt-0.5 text-xs text-slate-400">
                campaign recipients
              </div>
            </div>

          </div>

        </header>

        {/* MESSAGE */}

        {message && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span>{message}</span>

            <button
              onClick={() =>
                setMessage('')
              }
              className="ml-4 text-slate-400 hover:text-slate-900"
            >
              ×
            </button>
          </div>
        )}

        {/* AUDIENCE */}

        {tab === 'audience' && (
          <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">

            {/* FILTER PANEL */}

            <aside className="h-fit rounded-[22px] border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Build audience
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Target schools precisely
                    </p>
                  </div>

                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-5 p-5">

                {/* SEARCH */}

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Search
                  </label>

                  <div className="relative">
                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value
                        )
                      }
                      placeholder="School, email or phone"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>

                {/* LOCATION */}

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Location
                  </label>

                  <div className="space-y-2">

                    <select
                      value={stateId}
                      onChange={(event) =>
                        setStateId(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                    >
                      <option value="">
                        All states
                      </option>

                      {states.map((state) => (
                        <option
                          key={state.id}
                          value={state.id}
                        >
                          {state.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={lgaId}
                      disabled={!stateId}
                      onChange={(event) =>
                        setLgaId(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">
                        All LGAs
                      </option>

                      {lgas.map((lga) => (
                        <option
                          key={lga.id}
                          value={lga.id}
                        >
                          {lga.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={cityId}
                      disabled={!lgaId}
                      onChange={(event) =>
                        setCityId(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">
                        All cities / towns
                      </option>

                      {cities.map((city) => (
                        <option
                          key={city.id}
                          value={city.id}
                        >
                          {city.name}
                        </option>
                      ))}
                    </select>

                  </div>
                </div>

                {/* SALES */}

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Sales
                  </label>

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="">
                      Any status
                    </option>

                    {STATUSES.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {formatStatus(item)}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* SMART FILTERS */}

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Smart filters
                  </label>

                  <div className="space-y-1 rounded-xl border border-slate-200 p-1">

                    {[
                      [
                        'Leads only',
                        leadOnly,
                        setLeadOnly,
                      ],
                      [
                        'Has email',
                        hasEmail,
                        setHasEmail,
                      ],
                      [
                        'Has phone',
                        hasPhone,
                        setHasPhone,
                      ],
                      [
                        'Fresh discovery',
                        freshOnly,
                        setFreshOnly,
                      ],
                    ].map(
                      ([
                        label,
                        value,
                        setter,
                      ]) => (
                        <label
                          key={
                            label as string
                          }
                          className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                            value
                              ? 'bg-slate-100 font-medium'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <span>
                            {label as string}
                          </span>

                          <input
                            type="checkbox"
                            checked={
                              value as boolean
                            }
                            onChange={(
                              event
                            ) =>
                              (
                                setter as (
                                  value: boolean
                                ) => void
                              )(
                                event.target
                                  .checked
                              )
                            }
                            className="h-4 w-4"
                          />
                        </label>
                      )
                    )}

                  </div>
                </div>

                <button
                  onClick={clearFilters}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  Reset audience
                </button>

              </div>

            </aside>

            {/* AUDIENCE TABLE */}

            <section className="min-w-0 rounded-[22px] border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 p-5 sm:p-6">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        Schools
                      </h2>

                      {loading && (
                        <span className="text-xs text-slate-400">
                          Updating…
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      Select schools to include in your next campaign.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">

                    <button
                      onClick={toggleAll}
                      disabled={
                        !audience.schools.length
                      }
                      className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      {allSelected
                        ? 'Clear visible'
                        : 'Select visible'}
                    </button>

                    <button
                      disabled={!selected.size}
                      onClick={() =>
                        setTab('composer')
                      }
                      className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-30"
                    >
                      Create campaign
                      {selected.size > 0 &&
                        ` · ${selected.size}`}
                    </button>

                  </div>

                </div>

                {/* SELECTION BAR */}

                {selected.size > 0 && (
                  <div className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <span className="text-sm font-semibold">
                        {selected.size}
                      </span>{' '}
                      schools selected
                    </div>

                    <div className="flex gap-4 text-xs text-slate-300">
                      <span>
                        {selectedEmailCount} email
                      </span>

                      <span>
                        {selectedLeadCount} leads
                      </span>

                      <button
                        onClick={() =>
                          setSelected(
                            new Set()
                          )
                        }
                        className="font-medium text-white underline underline-offset-2"
                      >
                        Clear
                      </button>
                    </div>

                  </div>
                )}

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-left">

                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">

                      <th className="w-12 px-5 py-3">
                        <input
                          type="checkbox"
                          checked={
                            allSelected
                          }
                          onChange={
                            toggleAll
                          }
                          className="h-4 w-4"
                        />
                      </th>

                      <th className="px-3 py-3">
                        School
                      </th>

                      <th className="px-3 py-3">
                        Contact
                      </th>

                      <th className="px-3 py-3">
                        Location
                      </th>

                      <th className="px-3 py-3">
                        Sales
                      </th>

                      <th className="px-3 py-3">
                        Discovery
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {audience.schools.map(
                      (school) => (
                        <tr
                          key={school.id}
                          className={`border-b border-slate-100 transition last:border-0 ${
                            selected.has(
                              school.id
                            )
                              ? 'bg-slate-50'
                              : 'hover:bg-slate-50/70'
                          }`}
                        >

                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={selected.has(
                                school.id
                              )}
                              onChange={() =>
                                toggleSchool(
                                  school.id
                                )
                              }
                              className="h-4 w-4"
                            />
                          </td>

                          <td className="px-3 py-4">

                            <div className="flex items-start gap-3">

                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                                {school.school_name
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">
                                  {school.school_name}
                                </div>

                                {school.address && (
                                  <div className="mt-1 max-w-[280px] truncate text-xs text-slate-400">
                                    {school.address}
                                  </div>
                                )}
                              </div>

                            </div>

                          </td>

                          <td className="px-3 py-4">

                            {school.email ? (
                              <div>
                                <div className="max-w-[260px] truncate text-sm text-slate-700">
                                  {school.email}
                                </div>

                                {school.phone && (
                                  <div className="mt-1 text-xs text-slate-400">
                                    {school.phone}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm text-slate-400">
                                  No email
                                </div>

                                {school.phone && (
                                  <div className="mt-1 text-xs text-slate-500">
                                    {school.phone}
                                  </div>
                                )}
                              </div>
                            )}

                          </td>

                          <td className="px-3 py-4">

                            <div className="max-w-[220px] text-xs leading-5 text-slate-600">
                              {[
                                school.area,
                                school.city,
                                school.lga,
                                school.state,
                              ]
                                .filter(Boolean)
                                .join(
                                  ', '
                                ) || 'Location unavailable'}
                            </div>

                          </td>

                          <td className="px-3 py-4">

                            <div className="flex flex-wrap gap-1.5">

                              {school.is_lead && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                                  Lead
                                </span>
                              )}

                              <span
                                className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${statusClasses(
                                  school.status
                                )}`}
                              >
                                {formatStatus(
                                  school.status
                                )}
                              </span>

                            </div>

                          </td>

                          <td className="px-3 py-4">

                            {school.is_fresh ? (
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                                <span className="text-xs font-semibold text-emerald-700">
                                  Fresh
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-xs font-medium text-slate-600">
                                  {school.discovery_count ||
                                    1}{' '}
                                  discoveries
                                </div>

                                {school.last_discovery_at && (
                                  <div className="mt-1 text-[10px] text-slate-400">
                                    Previously found
                                  </div>
                                )}
                              </div>
                            )}

                          </td>

                        </tr>
                      )
                    )}

                    {!audience.schools.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-20 text-center"
                        >
                          <div className="mx-auto max-w-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                              ◎
                            </div>

                            <div className="mt-4 font-semibold">
                              No schools found
                            </div>

                            <p className="mt-1 text-sm leading-6 text-slate-400">
                              {loading
                                ? 'Updating your audience…'
                                : 'Try widening your location or removing some filters.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

              {audience.schools.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                  Showing {audience.schools.length} visible schools from an audience of{' '}
                  {audience.total.toLocaleString()}.
                </div>
              )}

            </section>

          </section>
        )}

        {/* COMPOSER */}

        {tab === 'composer' && (
          <section>

            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  New campaign
                </div>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Compose broadcast
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Prepare the message that will be sent to your selected schools.
                </p>
              </div>

              <button
                onClick={() =>
                  setTab('audience')
                }
                className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm"
              >
                ← Audience
              </button>

            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">

              {/* EDITOR */}

              <div className="rounded-[22px] border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between">

                    <div>
                      <div className="font-semibold">
                        Email
                      </div>

                      <div className="mt-0.5 text-xs text-slate-400">
                        {selected.size.toLocaleString()} recipients
                      </div>
                    </div>

                    <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      Draft
                    </div>

                  </div>
                </div>

                <div className="space-y-5 p-5 sm:p-6">

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">
                      From
                    </label>

                    <input
                      value={senderName}
                      onChange={(event) =>
                        setSenderName(
                          event.target.value
                        )
                      }
                      placeholder="TheHandler"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">
                      Subject
                    </label>

                    <input
                      value={subject}
                      onChange={(event) =>
                        setSubject(
                          event.target.value
                        )
                      }
                      placeholder="e.g. A simpler way to manage your school"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-600">
                        Message
                      </label>

                      <span className="text-[10px] text-slate-400">
                        HTML
                      </span>
                    </div>

                    <textarea
                      value={body}
                      onChange={(event) =>
                        setBody(
                          event.target.value
                        )
                      }
                      className="min-h-[420px] w-full resize-y rounded-xl border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-slate-100 outline-none"
                      placeholder="Write your email HTML here…"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <div className="text-xs font-semibold">
                      Personalization
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      These values are replaced for each school before delivery.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">

                      <code className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-slate-600 shadow-sm">
                        {'{{school_name}}'}
                      </code>

                      <code className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-slate-600 shadow-sm">
                        {'{{status}}'}
                      </code>

                    </div>

                  </div>

                </div>

              </div>

              {/* PREVIEW + CAMPAIGN INFO */}

              <div className="space-y-5">

                <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        Campaign preview
                      </div>

                      <div className="mt-0.5 text-xs text-slate-400">
                        Example recipient
                      </div>
                    </div>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
                      Preview
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">

                      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {senderName ||
                          'TheHandler'}
                      </div>

                      <div className="mt-1 truncate font-semibold">
                        {subject ||
                          'Your campaign subject'}
                      </div>

                    </div>

                    <div
                      className="prose prose-sm max-w-none p-6"
                      dangerouslySetInnerHTML={{
                        __html:
                          previewBody,
                      }}
                    />

                  </div>

                </div>

                {/* RECIPIENT SUMMARY */}

                <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="font-semibold">
                    Delivery audience
                  </div>

                  <div className="mt-4 divide-y divide-slate-100">

                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-slate-500">
                        Selected schools
                      </span>

                      <span className="font-semibold">
                        {selected.size}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-slate-500">
                        Email addresses
                      </span>

                      <span className="font-semibold">
                        {selectedEmailCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-slate-500">
                        Leads
                      </span>

                      <span className="font-semibold">
                        {selectedLeadCount}
                      </span>
                    </div>

                  </div>

                </div>

                {/* RESEND */}

                <div className="rounded-[22px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">

                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />

                    <span className="text-sm font-semibold">
                      Delivery infrastructure
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Campaigns are queued first. Once your Resend API key and verified sending domain are configured, the worker can deliver queued campaigns automatically.
                  </p>

                </div>

                <button
                  disabled={
                    sending ||
                    !selected.size
                  }
                  onClick={queueBroadcast}
                  className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {sending
                    ? 'Queueing campaign…'
                    : `Queue campaign · ${selectedEmailCount} recipients`}
                </button>

              </div>

            </div>

          </section>
        )}

        {/* HISTORY */}

        {tab === 'history' && (
          <section>

            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Campaigns
                </div>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Broadcast history
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Every campaign remains recorded here.
                </p>
              </div>

              <button
                onClick={loadHistory}
                className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold shadow-sm hover:bg-slate-50"
              >
                Refresh
              </button>

            </div>

            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">

              <div className="grid grid-cols-2 divide-x border-b border-slate-100 sm:grid-cols-4">

                <div className="p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    Campaigns
                  </div>

                  <div className="mt-1 text-2xl font-semibold">
                    {history.length}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    Recipients
                  </div>

                  <div className="mt-1 text-2xl font-semibold">
                    {history
                      .reduce(
                        (
                          total,
                          campaign
                        ) =>
                          total +
                          campaign.recipient_count,
                        0
                      )
                      .toLocaleString()}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    Sent
                  </div>

                  <div className="mt-1 text-2xl font-semibold">
                    {history
                      .reduce(
                        (
                          total,
                          campaign
                        ) =>
                          total +
                          campaign.sent_count,
                        0
                      )
                      .toLocaleString()}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    Failed
                  </div>

                  <div className="mt-1 text-2xl font-semibold">
                    {history
                      .reduce(
                        (
                          total,
                          campaign
                        ) =>
                          total +
                          campaign.failed_count,
                        0
                      )
                      .toLocaleString()}
                  </div>
                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[850px] text-left">

                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">

                      <th className="px-5 py-3">
                        Campaign
                      </th>

                      <th className="px-3 py-3">
                        Recipients
                      </th>

                      <th className="px-3 py-3">
                        Delivered
                      </th>

                      <th className="px-3 py-3">
                        Failed
                      </th>

                      <th className="px-3 py-3">
                        Status
                      </th>

                      <th className="px-3 py-3">
                        Created
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {history.map(
                      (campaign) => (
                        <tr
                          key={campaign.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                        >

                          <td className="px-5 py-4">

                            <div className="font-semibold">
                              {campaign.subject}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              From{' '}
                              {campaign.sender_name}
                            </div>

                          </td>

                          <td className="px-3 py-4 text-sm font-medium">
                            {campaign.recipient_count.toLocaleString()}
                          </td>

                          <td className="px-3 py-4">

                            <div className="font-medium">
                              {campaign.sent_count.toLocaleString()}
                            </div>

                            {campaign.recipient_count > 0 && (
                              <div className="mt-1 text-[10px] text-slate-400">
                                {Math.round(
                                  (campaign.sent_count /
                                    campaign.recipient_count) *
                                    100
                                )}
                                % sent
                              </div>
                            )}

                          </td>

                          <td className="px-3 py-4 text-sm">
                            {campaign.failed_count}
                          </td>

                          <td className="px-3 py-4">

                            <span
                              className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${broadcastStatusClasses(
                                campaign.status
                              )}`}
                            >
                              {formatStatus(
                                campaign.status
                              )}
                            </span>

                          </td>

                          <td className="px-3 py-4 text-xs text-slate-400">
                            {new Date(
                              campaign.created_at
                            ).toLocaleString()}
                          </td>

                        </tr>
                      )
                    )}

                    {!history.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-20 text-center"
                        >
                          <div className="mx-auto max-w-sm">

                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                              ◌
                            </div>

                            <div className="mt-4 font-semibold">
                              No campaigns yet
                            </div>

                            <p className="mt-1 text-sm leading-6 text-slate-400">
                              Your queued and completed broadcasts will appear here.
                            </p>

                          </div>
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </section>
        )}

      </div>
    </main>
  )
}