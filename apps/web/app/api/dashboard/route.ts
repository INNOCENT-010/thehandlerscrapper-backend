import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const db = supabaseAdmin()

  const [
    schools,
    high,
    contacted,
    newLeads,
    states,
    upcomingVisits,
  ] = await Promise.all([
    db
      .from('schools')
      .select('id', { count: 'exact', head: true }),

    db
      .from('schools')
      .select('id', { count: 'exact', head: true })
      .gte('lead_score', 75),

    db
      .from('schools')
      .select('id', { count: 'exact', head: true })
      .not('status', 'eq', 'NEW'),

    db
      .from('schools')
      .select(`
        id,
        school_name,
        state_id,
        lga_id,
        city_id,
        area_id,
        lead_score,
        priority,
        status,
        phone,
        email,
        website
      `)
      .order('lead_score', { ascending: false })
      .limit(8),

    db
      .from('locations')
      .select('id, name')
      .eq('type', 'state')
      .order('name'),

    db
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_for', new Date().toISOString()),
  ])

  const firstError = [
    schools,
    high,
    contacted,
    newLeads,
    states,
    upcomingVisits,
  ].find(result => result.error)?.error

  if (firstError) {
    return NextResponse.json(
      { error: firstError.message },
      { status: 500 }
    )
  }

  /*
   * Build one location lookup table.
   *
   * This avoids relying on Supabase relationship names and
   * makes the API resilient even though schools has several
   * foreign keys into locations.
   */
  const locationIds = new Set<string>()

  for (const lead of newLeads.data ?? []) {
    if (lead.state_id) locationIds.add(lead.state_id)
    if (lead.lga_id) locationIds.add(lead.lga_id)
    if (lead.city_id) locationIds.add(lead.city_id)
    if (lead.area_id) locationIds.add(lead.area_id)
  }

  const { data: locations, error: locationsError } =
    locationIds.size > 0
      ? await db
          .from('locations')
          .select('id, name, type')
          .in('id', Array.from(locationIds))
      : { data: [], error: null }

  if (locationsError) {
    return NextResponse.json(
      { error: locationsError.message },
      { status: 500 }
    )
  }

  const locationMap = new Map(
    (locations ?? []).map(location => [
      location.id,
      location,
    ])
  )

  const leads = (newLeads.data ?? []).map(lead => ({
    ...lead,

    state:
      lead.state_id
        ? locationMap.get(lead.state_id)?.name ?? null
        : null,

    lga:
      lead.lga_id
        ? locationMap.get(lead.lga_id)?.name ?? null
        : null,

    city:
      lead.city_id
        ? locationMap.get(lead.city_id)?.name ?? null
        : null,

    area:
      lead.area_id
        ? locationMap.get(lead.area_id)?.name ?? null
        : null,
  }))

  const stateCounts = await Promise.all(
    (states.data ?? []).map(async state => {
      const result = await db
        .from('schools')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('state_id', state.id)

      return {
        id: state.id,
        name: state.name,
        count: result.count ?? 0,
      }
    })
  )

  return NextResponse.json({
    stats: {
      schools: schools.count ?? 0,
      highPriority: high.count ?? 0,
      contacted: contacted.count ?? 0,
      upcomingVisits: upcomingVisits.count ?? 0,
    },

    leads,

    stateCounts: stateCounts
      .filter(state => state.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  })
}