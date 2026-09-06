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
  emails: Array<{
    id: string
    email: string
    label: string
    opted_out: boolean
  }>
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

function normalizeNigerianPhone(value: string | null) {
  if (!value) return null
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `234${digits.slice(1)}`
  if (!digits.startsWith('234') && digits.length === 10) digits = `234${digits}`
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

function phoneLinks(value: string | null) {
  const digits = normalizeNigerianPhone(value)
  if (!digits) return null
  return { call: `tel:+${digits}`, whatsapp: `https://wa.me/${digits}` }
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
    case 'SUBMITTED':
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

function Icon({
  name,
  size = 18,
}: {
  name:
    | 'search'
    | 'users'
    | 'mail'
    | 'phone'
    | 'filter'
    | 'chevron'
    | 'arrow'
    | 'check'
    | 'refresh'
    | 'send'
    | 'clock'
    | 'location'
    | 'spark'
    | 'close'
  size?: number
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      )

    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )

    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )

    case 'phone':
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" />
        </svg>
      )

    case 'filter':
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      )

    case 'chevron':
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      )

    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      )

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )

    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 11a8.1 8.1 0 0 0-15.5-3" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8.1 8.1 0 0 0 15.5 3" />
          <path d="M20 20v-4h-4" />
        </svg>
      )

    case 'send':
      return (
        <svg {...common}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      )

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )

    case 'location':
      return (
        <svg {...common}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      )

    case 'spark':
      return (
        <svg {...common}>
          <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6Z" />
          <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" />
        </svg>
      )

    case 'close':
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      )
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
  const [selectedEmails, setSelectedEmails] =
    useState<Record<string, string>>({})

  const [subject, setSubject] = useState(
    'A better way to manage school records'
  )
  const [senderName, setSenderName] =
    useState('TheHandler')

  const [body, setBody] = useState(
    '<p>Dear {{school_name}} Management,</p><p>We would like to introduce <strong>TheHandler</strong>, a school operations and records platform designed around how schools actually work.</p><p>Many school management systems require staff to complete their work first and then upload or re-enter records into another system. Schools without such systems often depend on calls, files, spreadsheets, and individual staff members to find information when questions arise.</p><p>TheHandler takes a different approach.</p><p>Instead of making record-keeping an additional task, the work itself creates the record. As staff carry out their normal responsibilities, TheHandler automatically builds a structured institutional timeline—creating a reliable history of activities, payments, attendance, student records, and other operations.</p><p>This makes records easier to retrieve, trace, audit, and use for decision-making without creating unnecessary work for staff.</p><p>Our team is delighted to introduce TheHandler to your management team and demonstrate how it could work within {{school_name}}.</p><p>Would you be available for a brief 20-minute demonstration this week?</p><p>We look forward to hearing from you.</p><p>Kind regards,<br><strong>INNOCENT AMAECHI</strong><br>TheHandler<br>WhatsApp/Call: <a href="tel:+2348104945035">+234 810 494 5035</a><br><a href="https://thehandler.xyz">thehandler.xyz</a></p>'
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
    const timer = setTimeout(loadAudience, 250)

    return () => clearTimeout(timer)
  }, [loadAudience])

  useEffect(() => {
    setSelected((current) => {
      const visible = new Set(
        audience.schools.map((school) => school.id)
      )

      return new Set(
        [...current].filter((id) => visible.has(id))
      )
    })
  }, [audience.schools])

  const selectedSchools = audience.schools.filter(
    (school) => selected.has(school.id)
  )

  const emailEligibleSchools = audience.schools.filter((school) =>
    school.emails.some((email) => !email.opted_out)
  )

  const allSelected =
    emailEligibleSchools.length > 0 &&
    emailEligibleSchools.every((school) =>
      selected.has(school.id)
    )

  const selectedEmailCount =
    selectedSchools.filter(
      (school) => Boolean(
        selectedEmails[school.id] ||
        school.emails.find((email) => !email.opted_out)?.email
      )
    ).length

  const selectedLeadCount =
    selectedSchools.filter(
      (school) => school.is_lead
    ).length

  function toggleSchool(id: string) {
    const school = audience.schools.find((item) => item.id === id)
    setSelected((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        const first = school?.emails.find((email) => !email.opted_out)
        if (first && !selectedEmails[id]) {
          setSelectedEmails((emails) => ({ ...emails, [id]: first.email }))
        }
      }

      return next
    })
  }

  function toggleAll() {
    setSelected((current) => {
      if (allSelected) return new Set()

      const selectable = audience.schools.filter((school) =>
        school.emails.some((email) => !email.opted_out)
      )
      setSelectedEmails((emails) => {
        const next = { ...emails }
        for (const school of selectable) {
          next[school.id] ||= school.emails.find((email) => !email.opted_out)!.email
        }
        return next
      })
      return new Set(selectable.map((school) => school.id))
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
    setSelectedEmails({})
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
      setMessage('Select at least one recipient.')
      return
    }

    if (!subject.trim()) {
      setMessage('Enter a campaign subject.')
      return
    }

    if (!body.trim()) {
      setMessage('Enter an email message.')
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipients: selectedSchools
              .map((school) => ({
                school_id: school.id,
                email:
                  selectedEmails[school.id] ||
                  school.emails.find((email) => !email.opted_out)?.email,
              }))
              .filter(
                (recipient): recipient is { school_id: string; email: string } =>
                  Boolean(recipient.email)
              ),
            subject: subject.trim(),
            body_html: body,
            sender_name:
              senderName.trim() || 'TheHandler',
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to queue broadcast'
        )
      }

      setMessage(
        `Broadcast queued for ${data.recipient_count} recipients.`
      )

      setSelected(new Set())
      setSelectedEmails({})

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
      selectedSchools[0]?.status || 'NEW'
    )

  const deliveryRate = history.reduce(
    (total, campaign) =>
      total + campaign.sent_count,
    0
  )

  return (
    <main className="min-h-screen bg-[#f4ecd9] text-[#11100d]">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

        {/* TOP HEADER */}

        <header className="mb-6 overflow-hidden rounded-[28px] bg-[#11100d] px-6 py-7 text-white shadow-[0_18px_50px_rgba(17,16,13,0.16)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[#ffe500] px-2.5 py-1 text-[9px] font-black tracking-[0.18em] text-black">
                  THEHANDLER
                </span>

                <span className="text-xs text-white/45">
                  / Outreach desk
                </span>
              </div>

              <h1 className="text-[32px] font-semibold tracking-[-0.045em] sm:text-[40px]">
                Broadcast with context
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Choose the exact school email, call immediately, open WhatsApp,
                or hand a consent-safe campaign to your self-hosted mail engine.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 sm:flex sm:items-center sm:gap-2">
                <span className="h-2 w-2 rounded-full bg-[#ffe500]" />
                <span className="text-xs font-medium text-white/70">
                  Mailroom connected
                </span>
              </div>

              <button
                onClick={async () => {
                  await loadHistory()
                  setTab('history')
                }}
                className="rounded-xl bg-[#ffe500] px-4 py-2.5 text-xs font-black text-black transition hover:bg-[#ffed4d]"
              >
                View history
              </button>
            </div>
          </div>
        </header>

        {/* WORKFLOW NAV */}

        <div className="mb-5 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 rounded-2xl border border-[#dfd2b5] bg-[#fffaf0] p-1.5 shadow-sm">

            <button
              onClick={() => setTab('audience')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                tab === 'audience'
                  ? 'bg-[#ffe500] text-black shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">
                1
              </span>
              Build audience
              {selected.size > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] ${
                    tab === 'audience'
                      ? 'bg-white/15 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {selected.size}
                </span>
              )}
            </button>

            <div className="hidden h-5 w-px bg-slate-200 sm:block" />

            <button
              onClick={() => setTab('composer')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                tab === 'composer'
                  ? 'bg-[#ffe500] text-black shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">
                2
              </span>
              Compose email
            </button>

            <div className="hidden h-5 w-px bg-slate-200 sm:block" />

            <button
              onClick={async () => {
                await loadHistory()
                setTab('history')
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                tab === 'history'
                  ? 'bg-[#ffe500] text-black shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">
                3
              </span>
              History
            </button>
          </div>
        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Icon name="check" size={15} />
              </span>
              <span className="text-slate-700">
                {message}
              </span>
            </div>

            <button
              onClick={() => setMessage('')}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}

        {/* AUDIENCE */}

        {tab === 'audience' && (
          <>
            {/* METRIC STRIP */}

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">

              {[
                {
                  label: 'Audience',
                  value: audience.total,
                  detail: 'schools found',
                  icon: 'users' as const,
                },
                {
                  label: 'Reachable',
                  value: audience.email_count,
                  detail: 'with email',
                  icon: 'mail' as const,
                },
                {
                  label: 'Leads',
                  value: audience.lead_count,
                  detail: 'active opportunities',
                  icon: 'spark' as const,
                },
                {
                  label: 'Fresh',
                  value: audience.fresh_count,
                  detail: 'recent discoveries',
                  icon: 'clock' as const,
                },
                {
                  label: 'Selected',
                  value: selected.size,
                  detail: 'campaign recipients',
                  icon: 'check' as const,
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {metric.label}
                    </span>

                    <span className="text-slate-300">
                      <Icon name={metric.icon} size={15} />
                    </span>
                  </div>

                  <div className="mt-3 text-[25px] font-semibold tracking-tight">
                    {metric.value.toLocaleString()}
                  </div>

                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {metric.detail}
                  </div>
                </div>
              ))}
            </div>

            <section className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">

              {/* FILTERS */}

              <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
                        <Icon name="filter" size={15} />
                      </span>

                      <div>
                        <h2 className="text-sm font-semibold">
                          Audience filters
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Refine your recipients
                        </p>
                      </div>
                    </div>

                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-slate-950 px-2 py-1 text-[9px] font-bold text-white">
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
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon name="search" size={15} />
                      </span>

                      <input
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="School, email or phone"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* LOCATION */}

                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-slate-400">
                        <Icon name="location" size={13} />
                      </span>

                      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Location
                      </label>
                    </div>

                    <div className="space-y-2">

                      {[
                        {
                          value: stateId,
                          setter: setStateId,
                          placeholder: 'All states',
                          options: states,
                        },
                        {
                          value: lgaId,
                          setter: setLgaId,
                          placeholder: 'All LGAs',
                          options: lgas,
                          disabled: !stateId,
                        },
                        {
                          value: cityId,
                          setter: setCityId,
                          placeholder: 'All cities / towns',
                          options: cities,
                          disabled: !lgaId,
                        },
                      ].map((item, index) => (
                        <div
                          key={item.placeholder}
                          className="relative"
                        >
                          <select
                            value={item.value}
                            disabled={item.disabled}
                            onChange={(event) =>
                              item.setter(event.target.value)
                            }
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">
                              {item.placeholder}
                            </option>

                            {item.options.map((option) => (
                              <option
                                key={option.id}
                                value={option.id}
                              >
                                {option.name}
                              </option>
                            ))}
                          </select>

                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="chevron" size={14} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* STATUS */}

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Sales status
                    </label>

                    <div className="relative">
                      <select
                        value={status}
                        onChange={(event) =>
                          setStatus(event.target.value)
                        }
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-xs font-medium text-slate-700 outline-none focus:border-slate-400"
                      >
                        <option value="">
                          Any status
                        </option>

                        {STATUSES.map((item) => (
                          <option key={item} value={item}>
                            {formatStatus(item)}
                          </option>
                        ))}
                      </select>

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon name="chevron" size={14} />
                      </span>
                    </div>
                  </div>

                  {/* SMART FILTERS */}

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Smart filters
                    </label>

                    <div className="overflow-hidden rounded-xl border border-slate-200">

                      {[
                        {
                          label: 'Leads only',
                          description: 'Prioritize opportunities',
                          value: leadOnly,
                          setter: setLeadOnly,
                        },
                        {
                          label: 'Has email',
                          description: 'Reachable by email',
                          value: hasEmail,
                          setter: setHasEmail,
                        },
                        {
                          label: 'Has phone',
                          description: 'Has a contact number',
                          value: hasPhone,
                          setter: setHasPhone,
                        },
                        {
                          label: 'Fresh discovery',
                          description: 'Recently discovered',
                          value: freshOnly,
                          setter: setFreshOnly,
                        },
                      ].map((item) => (
                        <label
                          key={item.label}
                          className={`flex cursor-pointer items-center justify-between border-b border-slate-100 px-3.5 py-3 last:border-0 ${
                            item.value
                              ? 'bg-slate-50'
                              : 'bg-white hover:bg-slate-50/60'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-medium text-slate-700">
                              {item.label}
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              {item.description}
                            </div>
                          </div>

                          <span
                            className={`relative h-5 w-9 rounded-full transition ${
                              item.value
                                ? 'bg-slate-950'
                                : 'bg-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.value}
                              onChange={(event) =>
                                item.setter(
                                  event.target.checked
                                )
                              }
                              className="sr-only"
                            />

                            <span
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                                item.value
                                  ? 'left-[18px]'
                                  : 'left-0.5'
                              }`}
                            />
                          </span>
                        </label>
                      ))}

                    </div>
                  </div>

                  <button
                    onClick={clearFilters}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    Reset all filters
                  </button>
                </div>
              </aside>

              {/* SCHOOL LIST */}

              <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold">
                          School audience
                        </h2>

                        {loading && (
                          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                            Updating
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        Choose exactly who should receive your campaign.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={toggleAll}
                        disabled={!audience.schools.length}
                        className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-40"
                      >
                        {allSelected
                          ? 'Clear visible'
                          : 'Select visible'}
                      </button>

                      <button
                        disabled={!selected.size}
                        onClick={() => setTab('composer')}
                        className="group flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        Continue to email
                        <Icon name="arrow" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* SELECTION SUMMARY */}

                  {selected.size > 0 && (
                    <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                            <Icon name="check" size={17} />
                          </div>

                          <div>
                            <div className="text-sm font-semibold">
                              {selected.size.toLocaleString()}{' '}
                              schools selected
                            </div>

                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Your campaign is ready to compose.
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px]">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <Icon name="mail" size={12} />
                            {selectedEmailCount} email
                          </span>

                          <span className="flex items-center gap-1.5 text-slate-300">
                            <Icon name="spark" size={12} />
                            {selectedLeadCount} leads
                          </span>

                          <button
                            onClick={() =>
                              setSelected(new Set())
                            }
                            className="font-medium text-white underline underline-offset-2"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">

                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">

                        <th className="w-12 px-5 py-3.5">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                          />
                        </th>

                        <th className="px-3 py-3.5">
                          School
                        </th>

                        <th className="px-3 py-3.5">
                          Contact
                        </th>

                        <th className="px-3 py-3.5">
                          Location
                        </th>

                        <th className="px-3 py-3.5">
                          Status
                        </th>

                        <th className="px-3 py-3.5">
                          Discovery
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {audience.schools.map((school) => (
                        <tr
                          key={school.id}
                          className={`border-b border-slate-100 transition last:border-0 ${
                            selected.has(school.id)
                              ? 'bg-slate-50'
                              : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={selected.has(school.id)}
                              disabled={!school.emails.some((email) => !email.opted_out)}
                              onChange={() =>
                                toggleSchool(school.id)
                              }
                              className="h-4 w-4 rounded border-slate-300 accent-amber-500 disabled:cursor-not-allowed disabled:opacity-30"
                            />
                          </td>

                          <td className="px-3 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-500">
                                {school.school_name
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">
                                  {school.school_name}
                                </div>

                                {school.address && (
                                  <div className="mt-1 max-w-[260px] truncate text-[10px] text-slate-400">
                                    {school.address}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-4">
                            <div className="min-w-[260px] space-y-2.5">
                              {school.emails.some((email) => !email.opted_out) ? (
                                <label className="block">
                                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                    Send email to
                                  </span>
                                  <select
                                    value={
                                      selectedEmails[school.id] ||
                                      school.emails.find((email) => !email.opted_out)?.email ||
                                      ''
                                    }
                                    onChange={(event) =>
                                      setSelectedEmails((emails) => ({
                                        ...emails,
                                        [school.id]: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                  >
                                    {school.emails.map((contact) => (
                                      <option
                                        key={contact.id}
                                        value={contact.email}
                                        disabled={contact.opted_out}
                                      >
                                        {contact.email} · {contact.opted_out ? 'Opted out' : contact.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : (
                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
                                  No eligible email
                                </div>
                              )}

                              {school.phone && phoneLinks(school.phone) && (
                                <div>
                                  <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                                    <Icon name="phone" size={11} />
                                    {school.phone}
                                  </div>
                                  <div className="flex gap-1.5">
                                    <a
                                      href={phoneLinks(school.phone)!.call}
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:border-slate-400"
                                    >
                                      Call
                                    </a>
                                    <a
                                      href={phoneLinks(school.phone)!.whatsapp}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                                    >
                                      WhatsApp
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-4">
                            <div className="max-w-[210px] text-[11px] leading-5 text-slate-500">
                              {[
                                school.area,
                                school.city,
                                school.lga,
                                school.state,
                              ]
                                .filter(Boolean)
                                .join(', ') ||
                                'Location unavailable'}
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
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                <span className="text-[11px] font-semibold text-emerald-700">
                                  Fresh
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-[11px] font-medium text-slate-600">
                                  {school.discovery_count || 1}{' '}
                                  discoveries
                                </div>

                                {school.last_discovery_at && (
                                  <div className="mt-1 text-[9px] text-slate-400">
                                    Previously found
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}

                      {!audience.schools.length && (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-20 text-center"
                          >
                            <div className="mx-auto max-w-sm">
                              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                <Icon name="search" size={21} />
                              </div>

                              <div className="mt-4 text-sm font-semibold">
                                No schools found
                              </div>

                              <p className="mt-1 text-xs leading-6 text-slate-400">
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
                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
                    <span>
                      Showing {audience.schools.length} visible
                      schools
                    </span>

                    <span>
                      {audience.total.toLocaleString()} total
                      matches
                    </span>
                  </div>
                )}
              </section>
            </section>
          </>
        )}

        {/* COMPOSER */}

        {tab === 'composer' && (
          <>
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Step 2
                  </span>

                  <span className="text-[10px] text-slate-400">
                    {selected.size} recipients
                  </span>
                </div>

                <h2 className="text-2xl font-semibold tracking-[-0.035em]">
                  Compose your email
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Write once. Personalization is handled automatically for each school.
                </p>
              </div>

              <button
                onClick={() => setTab('audience')}
                className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold shadow-sm transition hover:bg-slate-50"
              >
                ← Back to audience
              </button>
            </div>

            {/* COMPOSER WORKSPACE */}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">

              {/* EMAIL EDITOR */}

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <Icon name="mail" size={16} />
                    </div>

                    <div>
                      <div className="text-sm font-semibold">
                        New broadcast
                      </div>

                      <div className="text-[10px] text-slate-400">
                        Email campaign
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                    Draft
                  </span>
                </div>

                <div className="p-5 sm:p-6">

                  {/* FROM */}

                  <div className="border-b border-slate-100 pb-5">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      From
                    </label>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-slate-500 shadow-sm">
                        {(
                          senderName || 'TH'
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <input
                        value={senderName}
                        onChange={(event) =>
                          setSenderName(event.target.value)
                        }
                        placeholder="TheHandler"
                        className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* SUBJECT */}

                  <div className="border-b border-slate-100 py-5">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Subject
                    </label>

                    <input
                      value={subject}
                      onChange={(event) =>
                        setSubject(event.target.value)
                      }
                      placeholder="Give your email a clear, compelling subject"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                      <span>
                        Keep it short and specific.
                      </span>

                      <span>
                        {subject.length} characters
                      </span>
                    </div>
                  </div>

                  {/* MESSAGE */}

                  <div className="pt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Message
                      </label>

                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">
                        HTML
                      </span>
                    </div>

                    <textarea
                      value={body}
                      onChange={(event) =>
                        setBody(event.target.value)
                      }
                      className="min-h-[430px] w-full resize-y rounded-xl border border-slate-200 bg-[#101216] px-4 py-4 font-mono text-[11px] leading-6 text-slate-200 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      placeholder="Write your email HTML here…"
                    />

                    {/* VARIABLES */}

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">
                          <Icon name="spark" size={14} />
                        </span>

                        <div className="text-xs font-semibold">
                          Personalization
                        </div>
                      </div>

                      <p className="mt-1 text-[10px] leading-5 text-slate-500">
                        These variables are automatically replaced for
                        each recipient before delivery.
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <code className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
                          {'{{school_name}}'}
                        </code>

                        <code className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
                          {'{{status}}'}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* RIGHT COLUMN */}

              <aside className="space-y-5">

                {/* PREVIEW */}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <div className="text-sm font-semibold">
                        Live preview
                      </div>

                      <div className="mt-0.5 text-[10px] text-slate-400">
                        Example recipient
                      </div>
                    </div>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">
                      PREVIEW
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-[8px] font-bold text-white">
                            {(
                              senderName || 'TH'
                            )
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="text-[9px] font-medium text-slate-500">
                              {senderName || 'TheHandler'}
                            </div>

                            <div className="truncate text-[11px] font-semibold text-slate-900">
                              {subject ||
                                'Your campaign subject'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        className="prose prose-sm max-w-none overflow-auto p-5 text-xs"
                        dangerouslySetInnerHTML={{
                          __html: previewBody,
                        }}
                      />
                    </div>
                  </div>
                </section>

                {/* RECIPIENT CARD */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        Ready to send
                      </div>

                      <div className="mt-0.5 text-[10px] text-slate-400">
                        Delivery audience
                      </div>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                      <Icon name="users" size={16} />
                    </div>
                  </div>

                  <div className="mt-5 space-y-1">

                    <div className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-slate-50">
                      <span className="text-xs text-slate-500">
                        Schools selected
                      </span>

                      <span className="text-sm font-semibold">
                        {selected.size.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-slate-50">
                      <span className="text-xs text-slate-500">
                        Valid email addresses
                      </span>

                      <span className="text-sm font-semibold">
                        {selectedEmailCount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-slate-50">
                      <span className="text-xs text-slate-500">
                        Leads included
                      </span>

                      <span className="text-sm font-semibold">
                        {selectedLeadCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {selectedEmailCount < selected.size && (
                    <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] leading-5 text-amber-700">
                      {selected.size - selectedEmailCount}{' '}
                      selected schools do not have an email address
                      and will not be reachable by email.
                    </div>
                  )}
                </section>

                {/* DELIVERY INFO */}

                <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">

                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                      <Icon name="send" size={13} />
                    </span>

                    <span className="text-xs font-semibold">
                      Campaign delivery
                    </span>
                  </div>

                  <p className="mt-3 text-[10px] leading-5 text-slate-400">
                    Your campaign is queued first and then delivered by
                    the configured email infrastructure. Each school
                    receives its personalized version of the message.
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-[9px] font-medium text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Self-hosted Mailroom
                  </div>
                </section>

                {/* SEND */}

                <button
                  disabled={
                    sending ||
                    !selected.size ||
                    !selectedEmailCount
                  }
                  onClick={queueBroadcast}
                  className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <span>
                    {sending
                      ? 'Queueing campaign…'
                      : `Send to ${selectedEmailCount.toLocaleString()} recipients`}
                  </span>

                  {!sending && (
                    <span className="transition group-hover:translate-x-0.5">
                      <Icon name="arrow" size={16} />
                    </span>
                  )}
                </button>

                <p className="text-center text-[9px] leading-4 text-slate-400">
                  You will be asked to confirm before the campaign is
                  queued.
                </p>
              </aside>
            </div>
          </>
        )}

        {/* HISTORY */}

        {tab === 'history' && (
          <>
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Step 3
                  </span>

                  <span className="text-[10px] text-slate-400">
                    Campaign records
                  </span>
                </div>

                <h2 className="text-2xl font-semibold tracking-[-0.035em]">
                  Broadcast history
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Track every campaign that has passed through your distribution system.
                </p>
              </div>

              <button
                onClick={loadHistory}
                className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold shadow-sm transition hover:bg-slate-50"
              >
                <Icon name="refresh" size={14} />
                Refresh
              </button>
            </div>

            {/* HISTORY METRICS */}

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

              {[
                {
                  label: 'Campaigns',
                  value: history.length,
                },
                {
                  label: 'Recipients',
                  value: history.reduce(
                    (total, campaign) =>
                      total + campaign.recipient_count,
                    0
                  ),
                },
                {
                  label: 'Submitted',
                  value: deliveryRate,
                },
                {
                  label: 'Failed',
                  value: history.reduce(
                    (total, campaign) =>
                      total + campaign.failed_count,
                    0
                  ),
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {metric.label}
                  </div>

                  <div className="mt-2 text-2xl font-semibold tracking-tight">
                    {metric.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* TABLE */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Icon name="clock" size={15} />
                  </div>

                  <div>
                    <div className="text-sm font-semibold">
                      Campaign activity
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Recent broadcast activity
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">

                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">

                      <th className="px-5 py-3.5">
                        Campaign
                      </th>

                      <th className="px-3 py-3.5">
                        Recipients
                      </th>

                      <th className="px-3 py-3.5">
                        Submitted
                      </th>

                      <th className="px-3 py-3.5">
                        Failed
                      </th>

                      <th className="px-3 py-3.5">
                        Status
                      </th>

                      <th className="px-3 py-3.5">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((campaign) => (
                      <tr
                        key={campaign.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <Icon name="mail" size={14} />
                            </div>

                            <div className="min-w-0">
                              <div className="max-w-[330px] truncate text-xs font-semibold">
                                {campaign.subject}
                              </div>

                              <div className="mt-1 text-[10px] text-slate-400">
                                From {campaign.sender_name}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-4 text-xs font-medium">
                          {campaign.recipient_count.toLocaleString()}
                        </td>

                        <td className="px-3 py-4">
                          <div className="text-xs font-semibold">
                            {campaign.sent_count.toLocaleString()}
                          </div>

                          {campaign.recipient_count > 0 && (
                            <div className="mt-1 text-[9px] text-slate-400">
                              {Math.round(
                                (campaign.sent_count /
                                  campaign.recipient_count) *
                                  100
                              )}
                              % submitted
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4 text-xs">
                          {campaign.failed_count}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${broadcastStatusClasses(
                              campaign.status
                            )}`}
                          >
                            {formatStatus(campaign.status)}
                          </span>
                        </td>

                        <td className="px-3 py-4 text-[10px] text-slate-400">
                          {new Date(
                            campaign.created_at
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {!history.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-20 text-center"
                        >
                          <div className="mx-auto max-w-sm">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                              <Icon name="mail" size={20} />
                            </div>

                            <div className="mt-4 text-sm font-semibold">
                              No campaigns yet
                            </div>

                            <p className="mt-1 text-xs leading-6 text-slate-400">
                              Once you send your first campaign, its
                              delivery activity will appear here.
                            </p>

                            <button
                              onClick={() => setTab('audience')}
                              className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white"
                            >
                              Build an audience
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
