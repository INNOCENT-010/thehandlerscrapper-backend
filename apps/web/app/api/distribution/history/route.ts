import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('broadcasts')
      .select(`
        id,
        subject,
        sender_name,
        status,
        recipient_count,
        sent_count,
        failed_count,
        created_at,
        started_at,
        completed_at
      `)
      .order('created_at', {
        ascending: false,
      })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      broadcasts: data || [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load broadcast history',
      },
      { status: 500 }
    )
  }
}