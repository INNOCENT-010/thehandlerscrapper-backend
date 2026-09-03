import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('visits')
      .select(`
        id,
        scheduled_for,
        completed_at,
        contact_name,
        outcome,
        notes,
        school_id,
        schools (
          id,
          school_name,
          phone,
          email,
          address,
          state_id,
          lga_id,
          city_id,
          area_id,
          is_lead,
          priority,
          status
        )
      `)
      .order('scheduled_for', {
        ascending: true,
      })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      visits: data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to load visits',
      },
      { status: 500 }
    )
  }
}