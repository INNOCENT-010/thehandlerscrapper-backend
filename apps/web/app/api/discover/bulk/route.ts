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

const allowedStatuses = [
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

const leadStatuses = allowedStatuses.filter(
  status => status !== 'NEW'
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const ids = Array.isArray(body.ids)
      ? body.ids.filter(Boolean)
      : []

    const action = body.action

    if (!ids.length) {
      return NextResponse.json(
        { error: 'No schools selected.' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    /*
     * Delete selected schools.
     */
    if (action === 'delete') {
      const { error } = await supabase
        .from('schools')
        .delete()
        .in('id', ids)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        count: ids.length,
      })
    }

    /*
     * Explicitly mark selected schools as leads.
     */
    if (action === 'LEAD') {
      const { error } = await supabase
        .from('schools')
        .update({
          is_lead: true,
          lead_marked_at: new Date().toISOString(),
          priority: 'high',
        })
        .in('id', ids)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        count: ids.length,
        is_lead: true,
      })
    }

    if (!allowedStatuses.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action.' },
        { status: 400 }
      )
    }

    /*
     * NEW means the school remains in discovery,
     * not actively in the sales pipeline.
     */
    if (action === 'NEW') {
      const { error } = await supabase
        .from('schools')
        .update({
          status: 'NEW',
          is_lead: false,
        })
        .in('id', ids)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        count: ids.length,
        status: action,
        is_lead: false,
      })
    }

    /*
     * Every other manual sales status automatically
     * promotes the schools to leads and priority.
     */
    if (leadStatuses.includes(action)) {
      const { error } = await supabase
        .from('schools')
        .update({
          status: action,
          is_lead: true,
          lead_marked_at: new Date().toISOString(),
          priority: 'high',
        })
        .in('id', ids)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        count: ids.length,
        status: action,
        is_lead: true,
        priority: 'high',
      })
    }

    return NextResponse.json(
      { error: 'Unsupported action.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('BULK ACTION ERROR:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error',
      },
      { status: 500 }
    )
  }
}