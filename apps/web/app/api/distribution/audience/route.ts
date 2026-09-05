import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const FRESH_HOURS = 24

export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const params = request.nextUrl.searchParams

    const stateId = params.get('state_id')
    const lgaId = params.get('lga_id')
    const cityId = params.get('city_id')
    const status = params.get('status')

    const leadOnly = params.get('lead_only') === 'true'
    const hasEmail = params.get('has_email') === 'true'
    const hasPhone = params.get('has_phone') === 'true'
    const freshOnly = params.get('fresh_only') === 'true'

    const search = params.get('search')?.trim() || ''

    let query = db
      .from('schools')
      .select(`
        id,
        school_name,
        email,
        phone,
        address,
        state_id,
        lga_id,
        city_id,
        area_id,
        is_lead,
        status,
        priority,
        updated_at,
        first_seen_at,
        discovery_count,
        last_discovery_run_id
      `)
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (stateId) {
      query = query.eq('state_id', stateId)
    }

    if (lgaId) {
      query = query.eq('lga_id', lgaId)
    }

    if (cityId) {
      query = query.eq('city_id', cityId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (leadOnly) {
      query = query.eq('is_lead', true)
    }

    if (hasPhone) {
      query = query
        .not('phone', 'is', null)
        .neq('phone', '')
    }

    if (search) {
      const safe = search.replace(/[%_]/g, '\\$&')

      query = query.or(
        [
          `school_name.ilike.%${safe}%`,
          `email.ilike.%${safe}%`,
          `phone.ilike.%${safe}%`,
          `address.ilike.%${safe}%`,
        ].join(',')
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('Distribution audience error:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const schools = data || []

    const schoolIds = schools.map((school) => school.id)
    const contactResult = schoolIds.length
      ? await db
          .from('school_contacts')
          .select('id,school_id,full_name,role,email,contact_type,opted_out')
          .in('school_id', schoolIds)
          .not('email', 'is', null)
          .neq('email', '')
      : { data: [], error: null }

    if (contactResult.error) {
      return NextResponse.json(
        { error: contactResult.error.message },
        { status: 500 }
      )
    }

    const emailsBySchool = new Map<string, Array<{
      id: string
      email: string
      label: string
      opted_out: boolean
    }>>()

    for (const contact of contactResult.data || []) {
      const email = contact.email?.trim().toLowerCase()
      if (!email) continue
      const current = emailsBySchool.get(contact.school_id) || []
      if (!current.some((item) => item.email === email)) {
        current.push({
          id: contact.id,
          email,
          label: contact.full_name || contact.role || contact.contact_type || 'School contact',
          opted_out: Boolean(contact.opted_out),
        })
      }
      emailsBySchool.set(contact.school_id, current)
    }

    const locationIds = Array.from(
      new Set(
        schools.flatMap((school) => [
          school.state_id,
          school.lga_id,
          school.city_id,
          school.area_id,
        ]).filter(Boolean)
      )
    )

    let locations: any[] = []

    if (locationIds.length) {
      const result = await db
        .from('locations')
        .select('id,name,type')
        .in('id', locationIds)

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 500 }
        )
      }

      locations = result.data || []
    }

    const locationMap = new Map(
      locations.map((location) => [
        location.id,
        location,
      ])
    )

    const freshCutoff =
      Date.now() - FRESH_HOURS * 60 * 60 * 1000

    const result = schools.map((school) => {
      const state =
        locationMap.get(school.state_id)?.name || null

      const lga =
        locationMap.get(school.lga_id)?.name || null

      const city =
        locationMap.get(school.city_id)?.name || null

      const area =
        locationMap.get(school.area_id)?.name || null

      const lastDiscovery =
        school.updated_at ||
        school.first_seen_at ||
        null

      const isFresh =
        !!lastDiscovery &&
        new Date(lastDiscovery).getTime() >= freshCutoff

      return {
        id: school.id,
        school_name: school.school_name,
        email: school.email,

        emails: (() => {
          const contacts = emailsBySchool.get(school.id) || []
          const primary = school.email?.trim().toLowerCase()
          if (primary && !contacts.some((item) => item.email === primary)) {
            return [
              { id: `school:${school.id}`, email: primary, label: 'Primary school email', opted_out: false },
              ...contacts,
            ]
          }
          return contacts
        })(),
        phone: school.phone,
        address: school.address,

        state,
        lga,
        city,
        area,

        is_lead: school.is_lead,
        status: school.status,
        priority: school.priority,

        discovery_count: school.discovery_count,

        last_discovery_at: lastDiscovery,
        is_fresh: isFresh,
      }
    })

    let filtered = freshOnly
      ? result.filter((school) => school.is_fresh)
      : result

    if (hasEmail) {
      filtered = filtered.filter((school) =>
        school.emails.some((email) => !email.opted_out)
      )
    }

    return NextResponse.json({
      schools: filtered,

      total: filtered.length,

      email_count: filtered.filter((school) =>
        school.emails.some((email) => !email.opted_out)
      ).length,

      phone_count: filtered.filter(
        (school) => !!school.phone?.trim()
      ).length,

      lead_count: filtered.filter(
        (school) => school.is_lead
      ).length,

      fresh_count: filtered.filter(
        (school) => school.is_fresh
      ).length,
    })
  } catch (error) {
    console.error('Distribution API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load audience',
      },
      { status: 500 }
    )
  }
}
