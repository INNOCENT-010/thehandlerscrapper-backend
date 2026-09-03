import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const LEAD_STATUSES = [
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin()
    const action = body.action

    /*
     * MARK LEAD
     */
    if (action === 'lead') {
      const { data, error } = await db
        .from('schools')
        .update({
          is_lead: true,
          lead_marked_at:
            new Date().toISOString(),
          priority: 'high',
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        school: data,
      })
    }

    /*
     * STATUS CHANGE
     */
    if (action === 'status') {
      const status =
        String(body.status || '').toUpperCase()

      if (!LEAD_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }

      const { data, error } = await db
        .from('schools')
        .update({
          status,
          is_lead: true,
          lead_marked_at:
            new Date().toISOString(),
          priority: 'high',
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        school: data,
      })
    }

    /*
     * SCHEDULE VISIT
     */
    if (action === 'visit') {
      if (!body.scheduled_for) {
        return NextResponse.json(
          {
            error:
              'Visit date and time are required',
          },
          { status: 400 }
        )
      }

      const { data: school, error: schoolError } =
        await db
          .from('schools')
          .update({
            is_lead: true,
            lead_marked_at:
              new Date().toISOString(),
            priority: 'high',
            status: 'SCHEDULED',
            scheduled_for:
              body.scheduled_for,
            scheduled_note:
              body.notes || null,
          })
          .eq('id', id)
          .select('*')
          .single()

      if (schoolError) {
        return NextResponse.json(
          { error: schoolError.message },
          { status: 500 }
        )
      }

      /*
       * Check whether the same visit
       * already exists.
       */
      const { data: existing } = await db
        .from('visits')
        .select('*')
        .eq('school_id', id)
        .eq(
          'scheduled_for',
          body.scheduled_for
        )
        .maybeSingle()

      let visit = existing

      if (!existing) {
        const { data, error } = await db
          .from('visits')
          .insert({
            school_id: id,
            scheduled_for:
              body.scheduled_for,
            contact_name:
              body.contact_name || null,
            notes:
              body.notes ||
              'Sales visit scheduled.',
          })
          .select('*')
          .single()

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          )
        }

        visit = data
      }

      /*
       * Add activity timeline entry.
       */
      await db
        .from('sales_activities')
        .insert({
          school_id: id,
          activity_type: 'visit',
          outcome: 'scheduled',
          note:
            body.notes ||
            'Sales visit scheduled.',
          occurred_at:
            new Date().toISOString(),
          scheduled_for:
            body.scheduled_for,
        })

      return NextResponse.json({
        success: true,
        school,
        visit,
      })
    }

    /*
     * FOLLOW-UP
     */
    if (action === 'follow_up') {
      const activityType =
        String(
          body.activity_type || 'call'
        ).toLowerCase()

      const { data, error } = await db
        .from('sales_activities')
        .insert({
          school_id: id,
          activity_type: activityType,
          outcome:
            body.outcome || 'scheduled',
          note:
            body.note || null,
          occurred_at:
            new Date().toISOString(),
          scheduled_for:
            body.scheduled_for || null,
        })
        .select('*')
        .single()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      await db
        .from('schools')
        .update({
          is_lead: true,
          lead_marked_at:
            new Date().toISOString(),
          priority: 'high',
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        activity: data,
      })
    }

    /*
     * COMPLETE VISIT
     */
    if (action === 'complete_visit') {
      if (!body.visit_id) {
        return NextResponse.json(
          {
            error:
              'Visit ID is required',
          },
          { status: 400 }
        )
      }

      const completedAt =
        new Date().toISOString()

      const { data: visit, error } =
        await db
          .from('visits')
          .update({
            completed_at:
              completedAt,
            outcome:
              body.outcome ||
              'completed',
            notes:
              body.notes || null,
          })
          .eq('id', body.visit_id)
          .eq('school_id', id)
          .select('*')
          .single()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      await db
        .from('schools')
        .update({
          status: 'VISITED',
          is_lead: true,
          priority: 'high',
        })
        .eq('id', id)

      await db
        .from('sales_activities')
        .insert({
          school_id: id,
          activity_type: 'visit',
          outcome:
            body.outcome ||
            'completed',
          note:
            body.notes ||
            'Visit completed.',
          occurred_at:
            completedAt,
        })

      return NextResponse.json({
        success: true,
        visit,
      })
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error(
      'LEAD ACTION ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to perform action',
      },
      { status: 500 }
    )
  }
}