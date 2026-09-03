import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const TYPE_ORDER: Record<string, number> = {
  country: 0,
  state: 1,
  lga: 2,
  city: 3,
  area: 4,
}

export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('locations')
      .select(`
        id,
        name,
        type,
        parent_id,
        slug,
        country_code
      `)
      .order('name', {
        ascending: true,
      })

    if (error) {
      console.error('LOCATIONS ERROR:', error)

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      )
    }

    const locations = (data ?? []).sort((a, b) => {
      const typeDifference =
        (TYPE_ORDER[a.type] ?? 99) -
        (TYPE_ORDER[b.type] ?? 99)

      if (typeDifference !== 0) {
        return typeDifference
      }

      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      locations,
    })
  } catch (error: any) {
    console.error('LOCATIONS EXCEPTION:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to load locations',
      },
      { status: 500 }
    )
  }
}