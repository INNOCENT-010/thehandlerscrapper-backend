import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin()

    const [school, contacts, signals, activities, visits] =
      await Promise.all([
        db
          .from('schools')
          .select('*')
          .eq('id', id)
          .single(),

        db
          .from('school_contacts')
          .select('*')
          .eq('school_id', id)
          .order('created_at', {
            ascending: true,
          }),

        db
          .from('lead_signals')
          .select('*')
          .eq('school_id', id)
          .order('points', {
            ascending: false,
          }),

        db
          .from('sales_activities')
          .select('*')
          .eq('school_id', id)
          .order('occurred_at', {
            ascending: false,
          }),

        db
          .from('visits')
          .select('*')
          .eq('school_id', id)
          .order('scheduled_for', {
            ascending: true,
          }),
      ])

    if (school.error) {
      return NextResponse.json(
        { error: school.error.message },
        { status: 404 }
      )
    }

    if (
      contacts.error ||
      signals.error ||
      activities.error ||
      visits.error
    ) {
      return NextResponse.json(
        {
          error:
            contacts.error?.message ||
            signals.error?.message ||
            activities.error?.message ||
            visits.error?.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      school: school.data,
      contacts: contacts.data || [],
      signals: signals.data || [],
      activities: activities.data || [],
      visits: visits.data || [],
    })
  } catch (error: any) {
    console.error('LEAD DETAIL ERROR:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to load lead',
      },
      { status: 500 }
    )
  }
}