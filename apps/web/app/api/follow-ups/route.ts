import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('sales_activities')
      .select(`
        id,
        activity_type,
        outcome,
        note,
        occurred_at,
        school_id,
        schools (
          id,
          school_name,
          phone,
          email,
          lead_score,
          priority,
          status,
          is_lead
        )
      `)
      .order('occurred_at', { ascending: false })

    if (error) {
      console.error('FOLLOW-UPS API ERROR:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const activities = (data ?? []).map((activity: any) => ({
      id: activity.id,
      activity_type: activity.activity_type,
      subject: activity.outcome || activity.activity_type,
      body: activity.note || '',
      created_at: activity.occurred_at,
      school_id: activity.school_id,

      school: Array.isArray(activity.schools)
        ? activity.schools[0] ?? null
        : activity.schools ?? null,
    }))

    return NextResponse.json({ activities })
  } catch (error: any) {
    console.error('FOLLOW-UPS API EXCEPTION:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to load follow-ups',
      },
      { status: 500 }
    )
  }
}