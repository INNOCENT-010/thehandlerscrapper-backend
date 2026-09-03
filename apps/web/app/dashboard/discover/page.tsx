'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import './discover.css'

type School = {
  id: string
  school_name: string
  address: string | null
  phone: string | null
  website: string | null
  lead_score: number | null
  priority: string | null
  status: string
  is_lead: boolean
  state_id?: string | null
  lga_id?: string | null
  city_id?: string | null
  area_id?: string | null
  last_discovery_run_id?: string | null
  enrichment_status?: string | null
  last_enriched_at?: string | null
}

type Location = {
  id: string
  name: string
  type: string
  parent_id: string | null
}

type DiscoveryRun = {
  id: string
  status: string
  requested_count: number
  found_count: number
  new_count: number
  updated_count: number
  failed_count: number
  error_message?: string | null
}

const statuses = [
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

const TERMINAL_STATUSES = [
  'COMPLETED',
  'PARTIAL',
  'FAILED',
]

export default function DiscoverPage() {
  const [locations, setLocations] =
    useState<Location[]>([])

  const [schools, setSchools] =
    useState<School[]>([])

  const [stateId, setStateId] =
    useState('')

  const [lgaId, setLgaId] =
    useState('')

  const [cityId, setCityId] =
    useState('')

  const [areaId, setAreaId] =
    useState('')

  const [areaSearch, setAreaSearch] =
    useState('')

  const [lgaSearch, setLgaSearch] =
    useState('')

  const [lgaOpen, setLgaOpen] =
    useState(false)

  const [schoolType, setSchoolType] =
    useState('private')

  const [limit, setLimit] =
    useState('20')

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [selected, setSelected] =
    useState<string[]>([])

  const [filter, setFilter] =
    useState('ALL')

  const [query, setQuery] =
    useState('')

  const [run, setRun] =
    useState<DiscoveryRun | null>(null)

  const [runId, setRunId] =
    useState<string | null>(null)

  const pollingRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null)

  /*
   * Load previously saved schools.
   *
   * This is what makes the results persistent.
   * If the user closes the browser and returns,
   * the schools are still here.
   */
  async function loadSchools(
    discoveryRunId?: string
  ) {
    try {
      const url =
        discoveryRunId
          ? `/api/discover?run_id=${encodeURIComponent(
              discoveryRunId
            )}`
          : '/api/discover'

      const response =
        await fetch(url, {
          cache: 'no-store',
        })

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to load schools'
        )
      }

      setSchools(
        data.schools || []
      )
    } catch (error) {
      console.error(
        'LOAD SCHOOLS ERROR:',
        error
      )
    }
  }

  /*
   * Initial page load.
   */
  useEffect(() => {
    fetch('/api/locations')
      .then(async response => {
        if (!response.ok) {
          throw new Error(
            'Failed to load locations'
          )
        }

        return response.json()
      })
      .then(data => {
        setLocations(
          data.locations || []
        )
      })
      .catch(error => {
        setMessage(error.message)
      })

    loadSchools()

    return () => {
      if (pollingRef.current) {
        clearInterval(
          pollingRef.current
        )
      }
    }
  }, [])

  const states =
    locations.filter(
      x => x.type === 'state'
    )

  const lgas =
    locations.filter(
      x =>
        x.type === 'lga' &&
        x.parent_id === stateId
    )

  const filteredLgas = useMemo(() => {
    const text = lgaSearch
      .trim()
      .toLowerCase()

    if (!text) {
      return lgas
    }

    return lgas.filter(lga =>
      lga.name
        .toLowerCase()
        .includes(text)
    )
  }, [lgas, lgaSearch])

  const cities =
    locations.filter(
      x =>
        x.type === 'city' &&
        x.parent_id === lgaId
    )

  const areas =
    locations.filter(
      x =>
        x.type === 'area' &&
        x.parent_id === cityId
    )

  const visibleSchools =
    useMemo(() => {
      return schools.filter(
        school => {
          const matchesStatus =
            filter === 'ALL' ||
            school.status === filter

          const text =
            query.toLowerCase()

          const matchesSearch =
            !text ||
            school.school_name
              ?.toLowerCase()
              .includes(text) ||
            school.address
              ?.toLowerCase()
              .includes(text) ||
            school.phone
              ?.toLowerCase()
              .includes(text)

          return (
            matchesStatus &&
            matchesSearch
          )
        }
      )
    }, [
      schools,
      filter,
      query,
    ])

  const allVisibleSelected =
    visibleSchools.length > 0 &&
    visibleSchools.every(
      school =>
        selected.includes(
          school.id
        )
    )

  /*
   * Poll the worker for run progress.
   *
   * At the same time we reload schools from
   * Supabase so newly saved schools appear
   * while discovery is still running.
   */
  function startPolling(
    discoveryRunId: string
  ) {
    if (pollingRef.current) {
      clearInterval(
        pollingRef.current
      )
    }

    const poll = async () => {
      try {
        const response =
          await fetch(
            `/api/discover/runs/${discoveryRunId}`,
            {
              cache: 'no-store',
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Failed to check discovery'
          )
        }

        const currentRun =
          data.run || data

        setRun(currentRun)

        /*
         * Pull the schools saved by this run.
         */
        await loadSchools(
          discoveryRunId
        )

        const status =
          String(
            currentRun.status ||
              ''
          ).toUpperCase()

        if (
          TERMINAL_STATUSES.includes(
            status
          )
        ) {
          if (pollingRef.current) {
            clearInterval(
              pollingRef.current
            )

            pollingRef.current =
              null
          }

          setLoading(false)

          if (status === 'FAILED') {
            setMessage(
              currentRun.error_message ||
                'Discovery failed.'
            )
          } else {
            setMessage(
              `${currentRun.found_count || 0} schools found • ${
                currentRun.new_count || 0
              } new • ${
                currentRun.updated_count || 0
              } updated`
            )
          }
        }
      } catch (error) {
        console.error(
          'DISCOVERY POLLING ERROR:',
          error
        )
      }
    }

    poll()

    pollingRef.current =
      setInterval(
        poll,
        1500
      )
  }

  /*
   * Queue a discovery.
   *
   * State is the only required location level.
   * LGA, City and Area are optional.
   */
  async function runDiscovery() {
    if (loading) return

    if (!stateId) {
      setMessage(
        'Select a state before starting discovery.'
      )
      return
    }

    setLoading(true)
    setMessage('')
    setSelected([])
    setRun(null)
    setRunId(null)

    try {
      const response =
        await fetch(
          '/api/discover',
          {
            method: 'POST',
            headers: {
              'content-type':
                'application/json',
            },
            body: JSON.stringify({
              state_id:
                stateId || null,

              lga_id:
                lgaId || null,

              city_id:
                cityId || null,

              area_id:
                areaId || null,

              area:
                areaSearch.trim() || null,

              school_type:
                schoolType,

              limit:
                Number(limit),
            }),
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            'Discovery failed'
        )
      }

      /*
       * Worker should return the queued
       * discovery run ID immediately.
       */
      const newRunId =
        data.run_id ||
        data.id

      if (!newRunId) {
        throw new Error(
          'Worker did not return a discovery run ID'
        )
      }

      setRunId(newRunId)

      setRun({
        id: newRunId,
        status:
          data.status ||
          'QUEUED',
        requested_count:
          Number(limit),
        found_count: 0,
        new_count: 0,
        updated_count: 0,
        failed_count: 0,
      })

      setMessage(
        'Discovery queued. Results will appear as schools are found.'
      )

      /*
       * The button is now immediately free.
       *
       * Polling continues independently.
       */
      setLoading(false)

      startPolling(
        newRunId
      )
    } catch (error) {
      setLoading(false)

      setMessage(
        error instanceof Error
          ? error.message
          : 'Discovery failed'
      )
    }
  }

  function toggle(id: string) {
    setSelected(current =>
      current.includes(id)
        ? current.filter(
            x => x !== id
          )
        : [
            ...current,
            id,
          ]
    )
  }

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected(current =>
        current.filter(
          id =>
            !visibleSchools.some(
              school =>
                school.id === id
            )
        )
      )
    } else {
      setSelected(current => [
        ...new Set([
          ...current,
          ...visibleSchools.map(
            school =>
              school.id
          ),
        ]),
      ])
    }
  }

  async function bulkAction(
    action: string
  ) {
    if (!selected.length) return

    if (
      action === 'delete' &&
      !window.confirm(
        `Delete ${selected.length} selected school${
          selected.length === 1
            ? ''
            : 's'
        }? This cannot be undone.`
      )
    ) {
      return
    }

    try {
      const response =
        await fetch(
          '/api/discover/bulk',
          {
            method: 'POST',
            headers: {
              'content-type':
                'application/json',
            },
            body: JSON.stringify({
              ids: selected,
              action,
            }),
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Action failed'
        )
      }

      if (
        action === 'delete'
      ) {
        setSchools(
          current =>
            current.filter(
              school =>
                !selected.includes(
                  school.id
                )
            )
        )
      } else {
        setSchools(
          current =>
            current.map(
              school =>
                selected.includes(
                  school.id
                )
                  ? {
                      ...school,
                      status:
                        action,
                    }
                  : school
            )
        )
      }

      setSelected([])

      setMessage(
        `${data.count} school${
          data.count === 1
            ? ''
            : 's'
        } updated.`
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Action failed'
      )
    }
  }

  const runStatus =
    String(
      run?.status || ''
    ).toUpperCase()

  const discoveryActive =
    runId &&
    !TERMINAL_STATUSES.includes(
      runStatus
    )

  return (
    <main className="discovery-shell">

      <section className="discovery-header">

        <div>
          <div className="eyebrow">
            SCHOOL LEAD ENGINE
          </div>

          <h1>
            Discover schools
          </h1>

          <p>
            Find, enrich and work school
            prospects from one workspace.
          </p>
        </div>

        <div className="header-count">
          <strong>
            {schools.length}
          </strong>

          <span>
            saved
          </span>
        </div>

      </section>

      <section className="discovery-panel">

        <div className="panel-heading">

          <div>
            <h2>
              Search territory
            </h2>

            <p>
              Narrow the search from
              state down to a specific
              area.
            </p>
          </div>

          <button
            className="discover-button"
            onClick={
              runDiscovery
            }
            disabled={false}
          >
            Start discovery
          </button>

        </div>

        <div className="territory-grid">

          <label>
            <span>
              State
            </span>

            <select
              value={stateId}
              onChange={e => {
                setStateId(
                  e.target.value
                )

                setLgaId('')
                setLgaSearch('')
                setLgaOpen(false)
                setCityId('')
                setAreaId('')
                setAreaSearch('')
              }}
            >
              <option value="">
                Select state
              </option>

              {states.map(
                state => (
                  <option
                    key={
                      state.id
                    }
                    value={
                      state.id
                    }
                  >
                    {state.name}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="lga-combobox">
            <span>
              LGA
            </span>

            <div
              style={{
                position: 'relative',
              }}
            >
              <input
                type="text"
                value={
                  lgaId
                    ? lgas.find(
                        lga =>
                          lga.id === lgaId
                      )?.name || lgaSearch
                    : lgaSearch
                }
                disabled={!stateId}
                placeholder={
                  stateId
                    ? 'Search LGA...'
                    : 'Select a state first'
                }
                onFocus={() => {
                  if (stateId) {
                    setLgaOpen(true)
                  }
                }}
                onChange={e => {
                  setLgaSearch(
                    e.target.value
                  )

                  setLgaId('')
                  setCityId('')
                  setAreaId('')
                  setAreaSearch('')

                  setLgaOpen(true)
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />

              {lgaOpen &&
                stateId && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      maxHeight: 240,
                      overflowY: 'auto',
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      marginTop: 4,
                      boxShadow:
                        '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setLgaId('')
                        setLgaSearch('')
                        setCityId('')
                        setAreaId('')
                        setAreaSearch('')
                        setLgaOpen(false)
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      All LGAs
                    </button>

                    {filteredLgas.length === 0 ? (
                      <div
                        style={{
                          padding: '10px 12px',
                          opacity: 0.6,
                        }}
                      >
                        No LGA found
                      </div>
                    ) : (
                      filteredLgas.map(lga => (
                        <button
                          key={lga.id}
                          type="button"
                          onClick={() => {
                            setLgaId(lga.id)
                            setLgaSearch(lga.name)
                            setCityId('')
                            setAreaId('')
                            setAreaSearch('')
                            setLgaOpen(false)
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '10px 12px',
                            textAlign: 'left',
                            border: 0,
                            background:
                              lga.id === lgaId
                                ? '#f3f3f3'
                                : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {lga.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
            </div>
          </label>

          <label>
            <span>
              City / Town
            </span>

            <select
              value={cityId}
              disabled={!lgaId}
              onChange={e => {
                setCityId(
                  e.target.value
                )

                setAreaId('')
                setAreaSearch('')
              }}
            >
              <option value="">
                All cities
              </option>

              {cities.map(
                city => (
                  <option
                    key={
                      city.id
                    }
                    value={
                      city.id
                    }
                  >
                    {city.name}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              Area
            </span>

            <input
              type="text"
              value={areaSearch}
              disabled={!lgaId}
              placeholder={
                lgaId
                  ? cityId
                    ? 'Type area e.g. Badore...'
                    : 'Type area / axis...'
                  : 'Select an LGA first'
              }
              onChange={e => {
                setAreaSearch(
                  e.target.value
                )

                setAreaId('')
              }}
            />
          </label>

        </div>

        <div className="discovery-options">

          <label>
            <span>
              School type
            </span>

            <select
              value={
                schoolType
              }
              onChange={e =>
                setSchoolType(
                  e.target.value
                )
              }
            >
              <option value="private">
                Private
              </option>

              <option value="public">
                Public
              </option>

              <option value="any">
                Any
              </option>
            </select>
          </label>

          <label>
            <span>
              Maximum schools
            </span>

            <input
              type="number"
              min="1"
              max="200"
              value={limit}
              onChange={e =>
                setLimit(
                  e.target.value
                )
              }
            />
          </label>

        </div>

        {run && (
          <div className="discovery-message">

            <strong>
              Discovery{' '}
              {runStatus
                .toLowerCase()}
            </strong>

            <span>
              {' '}
              • {run.found_count}{' '}
              found
              {' '}
              • {run.new_count}{' '}
              new
              {' '}
              • {run.updated_count}{' '}
              updated
              {' '}
              • {run.failed_count}{' '}
              failed
            </span>

          </div>
        )}

        {message && (
          <div className="discovery-message">
            {message}
          </div>
        )}

      </section>

      {schools.length > 0 && (
        <section className="results-section">

          <div className="results-toolbar">

            <div>
              <strong>
                {
                  visibleSchools.length
                }
              </strong>

              <span>
                {' '}
                schools
              </span>
            </div>

            <input
              className="results-search"
              placeholder="Search discovered schools…"
              value={query}
              onChange={e =>
                setQuery(
                  e.target.value
                )
              }
            />

            <select
              value={filter}
              onChange={e =>
                setFilter(
                  e.target.value
                )
              }
            >
              <option value="ALL">
                All statuses
              </option>

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

          </div>

          {discoveryActive && (
            <div className="discovery-message">
              Searching in the
              background. New schools
              will appear automatically.
            </div>
          )}

          {selected.length > 0 && (
            <div className="bulk-bar">

              <strong>
                {selected.length}{' '}
                selected
              </strong>

              <div className="bulk-actions">

                <button
                  onClick={() =>
                    bulkAction(
                      'SCHEDULED'
                    )
                  }
                >
                  Schedule
                </button>

                <button
                  onClick={() =>
                    bulkAction(
                      'CONTACTED'
                    )
                  }
                >
                  Contacted
                </button>

                <button
                  onClick={() =>
                    bulkAction(
                      'INTERESTED'
                    )
                  }
                >
                  Interested
                </button>

                <button
                  onClick={() =>
                    bulkAction(
                      'VISITED'
                    )
                  }
                >
                  Visited
                </button>

                <button
                  className="danger"
                  onClick={() =>
                    bulkAction(
                      'delete'
                    )
                  }
                >
                  Delete
                </button>

              </div>

            </div>
          )}

          <div className="results-table-wrap">

            <table className="results-table">

              <thead>
                <tr>

                  <th className="check-cell">
                    <input
                      type="checkbox"
                      checked={
                        allVisibleSelected
                      }
                      onChange={
                        toggleAll
                      }
                    />
                  </th>

                  <th>
                    School
                  </th>

                  <th>
                    Location
                  </th>

                  <th>
                    Contact
                  </th>

                  <th>
                    Score
                  </th>

                  <th>
                    Status
                  </th>

                  <th>Status</th>

                  <th>Actions</th>

                </tr>
              </thead>

              <tbody>

                {visibleSchools.map(
                  school => (
                    <tr
                      key={
                        school.id
                      }
                    >

                      <td className="check-cell">
                        <input
                          type="checkbox"
                          checked={selected.includes(
                            school.id
                          )}
                          onChange={() =>
                            toggle(
                              school.id
                            )
                          }
                        />
                      </td>

                      <td>
                        <Link
                          href={`/dashboard/discover/${school.id}`}
                          className="school-link"
                        >
                          <strong>
                            {
                              school.school_name
                            }
                          </strong>

                          <small>
                            {school.website ||
                              'No website found'}
                          </small>
                        </Link>
                      </td>

                      <td>
                        <span className="location-text">
                          {school.address ||
                            'Location unavailable'}
                        </span>
                      </td>

                      <td>
                        <div className="contact-cell">

                          <span>
                            {school.phone ||
                              'No phone'}
                          </span>

                          {school.website && (
                            <a
                              href={
                                school.website
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Website ↗
                            </a>
                          )}

                        </div>
                      </td>

                      <td>
                        <Score
                          score={
                            school.lead_score ||
                            0
                          }
                        />
                      </td>

                      <td>
                        <div>
                          <Status
                            status={
                              school.status
                            }
                          />

                          {school.enrichment_status &&
                            school.enrichment_status !==
                              'COMPLETED' && (
                              <small
                                style={{
                                  display:
                                    'block',
                                  marginTop:
                                    '4px',
                                  opacity:
                                    0.6,
                                }}
                              >
                                {
                                  school.enrichment_status
                                }
                              </small>
                            )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            school.status === 'NEW'
                              ? 'status-new'
                              : 'status-active'
                          }`}
                        >
                          {school.status}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                          }}
                        >
                          <button
                            type="button"
                            onClick={async () => {
                              const response = await fetch(
                                `/api/leads/${school.id}/actions`,
                                {
                                  method: 'POST',
                                  headers: {
                                    'content-type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    action: 'lead',
                                  }),
                                }
                              )

                              if (response.ok) {
                                setSchools(current =>
                                  current.map(x =>
                                    x.id === school.id
                                      ? {
                                          ...x,
                                          is_lead: true,
                                          priority: 'high',
                                        }
                                      : x
                                  )
                                )
                              }
                            }}
                            disabled={school.is_lead}
                          >
                            {school.is_lead
                              ? '✓ Lead'
                              : '+ Lead'}
                          </button>

                          <Link
                            href={`/dashboard/leads/${school.id}`}
                            className="view-link"
                          >
                            Actions →
                          </Link>

                          <Link
                            href={`/dashboard/discover/${school.id}`}
                            className="view-link"
                          >
                            View
                          </Link>
                        </div>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

            {visibleSchools.length ===
              0 && (
              <div className="empty-results">
                No schools match your
                filters.
              </div>
            )}

          </div>

        </section>
      )}

    </main>
  )
}

function Score({
  score,
}: {
  score: number
}) {
  const label =
    score >= 75
      ? 'High'
      : score >= 50
        ? 'Medium'
        : 'Low'

  return (
    <div className="score">
      <strong>
        {score}
      </strong>

      <span>
        {label}
      </span>
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