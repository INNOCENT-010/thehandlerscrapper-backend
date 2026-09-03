import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin()

    const stateId =
      request.nextUrl.searchParams.get('state_id')

    const lgaId =
      request.nextUrl.searchParams.get('lga_id')

    const status =
      request.nextUrl.searchParams.get('status')

    const priority =
      request.nextUrl.searchParams.get('priority')

    let query = db
      .from('schools')
      .select(`
        id,
        school_name,
        address,
        phone,
        email,
        website,
        lead_score,
        priority,
        status,
        school_type,
        state_id,
        lga_id,
        city_id,
        area_id,
        is_lead,
        lead_marked_at,
        scheduled_for,
        scheduled_note,
        created_at,
        updated_at
      `)
      .eq('is_lead', true)
      .order('updated_at', {
        ascending: false,
      })

    if (stateId) {
      query = query.eq('state_id', stateId)
    }

    if (lgaId) {
      query = query.eq('lga_id', lgaId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data, error } = await query.limit(1000)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const schools = data || []

    const schoolIds = schools.map(x => x.id)

    let activities: any[] = []
    let visits: any[] = []

    if (schoolIds.length) {
      const [activityResult, visitResult] =
        await Promise.all([
          db
            .from('sales_activities')
            .select('*')
            .in('school_id', schoolIds)
            .order('occurred_at', {
              ascending: false,
            }),

          db
            .from('visits')
            .select('*')
            .in('school_id', schoolIds)
            .order('scheduled_for', {
              ascending: true,
            }),
        ])

      activities = activityResult.data || []
      visits = visitResult.data || []
    }

    const leads = schools.map(school => ({
      ...school,

      last_activity:
        activities.find(
          x => x.school_id === school.id
        ) || null,

      next_visit:
        visits.find(
          x =>
            x.school_id === school.id &&
            !x.completed_at
        ) || null,
    }))

    return NextResponse.json({
      leads,
      count: leads.length,
    })
  } catch (error: any) {
    console.error('LEADS API ERROR:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to load leads',
      },
      { status: 500 }
    )
  }
}