import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

const leadStatuses = [
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('schools')
      .select(`
        *,
        school_contacts (*),
        school_pages (*),
        lead_signals (*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('GET SCHOOL ERROR:', error)

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      school: data,
    })
  } catch (error) {
    console.error('GET SCHOOL EXCEPTION:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load school',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const allowedFields = [
      'status',
      'notes',
      'scheduled_for',
      'scheduled_note',
    ]

    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    /*
     * Explicitly allow marking a school as a lead.
     */
    if ('is_lead' in body) {
      updates.is_lead = Boolean(body.is_lead)

      if (body.is_lead === true) {
        updates.lead_marked_at = new Date().toISOString()
      }
    }

    /*
     * A manual sales status automatically promotes
     * the school into the lead pipeline.
     */
    if (
      typeof body.status === 'string' &&
      leadStatuses.includes(body.status)
    ) {
      updates.is_lead = true
      updates.lead_marked_at = new Date().toISOString()

      /*
       * Manual sales action should make this a priority.
       * Don't downgrade an already high priority school.
       */
      updates.priority = 'high'
    }

    /*
     * Explicit "mark as lead" also makes the school priority.
     */
    if (body.is_lead === true) {
      updates.priority = 'high'
    }

    /*
     * Scheduling is automatically a sales action.
     */
    if (body.scheduled_for) {
      updates.is_lead = true
      updates.lead_marked_at = new Date().toISOString()
      updates.priority = 'high'

      if (!body.status) {
        updates.status = 'SCHEDULED'
      }
    }

    /*
     * If a school is explicitly unmarked as a lead,
     * leave its status alone but remove lead flag.
     */
    if (body.is_lead === false) {
      updates.is_lead = false
      updates.lead_marked_at = null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields supplied' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('schools')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('PATCH SCHOOL ERROR:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      school: data,
    })
  } catch (error) {
    console.error('PATCH SCHOOL EXCEPTION:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update school',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('DELETE SCHOOL ERROR:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('DELETE SCHOOL EXCEPTION:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete school',
      },
      { status: 500 }
    )
  }
}