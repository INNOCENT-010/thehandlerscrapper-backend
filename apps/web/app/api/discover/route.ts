import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const workerUrl =
  process.env.WORKER_URL ||
  process.env.LEAD_WORKER_URL ||
  'http://127.0.0.1:8000'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server environment variables'
    )
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey
  )
}

/**
 * START DISCOVERY
 */
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json()

    console.log('DISCOVERY REQUEST:', body)

    const response = await fetch(
      `${workerUrl}/discover`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      }
    )

    const text = await response.text()

    let data: any

    try {
      data = JSON.parse(text)
    } catch {
      data = {
        error:
          text ||
          'Worker returned an invalid response',
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.error ||
            `Discovery worker returned ${response.status}`,
          worker_status: response.status,
          worker_response: data,
        },
        {
          status: response.status,
        }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error(
      'DISCOVERY API ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to connect to discovery worker',
      },
      { status: 500 }
    )
  }
}

/**
 * GET DISCOVERY RESULTS
 *
 * /api/discover
 *     → recent discovery results only
 *
 * /api/discover?run_id=xxx
 *     → schools from one exact discovery batch
 */
export async function GET(
  request: NextRequest
) {
  try {
    const db = getSupabase()

    const runId =
      request.nextUrl.searchParams.get(
        'run_id'
      )

    /*
     * EXACT BATCH
     */
    if (runId) {
      const { data, error } = await db
        .from('discovery_run_schools')
        .select(`
          id,
          created_at,
          school_id,
          schools (
            id,
            school_name,
            address,
            phone,
            website,
            lead_score,
            priority,
            status,
            is_lead,
            state_id,
            lga_id,
            city_id,
            area_id,
            last_discovery_run_id,
            enrichment_status,
            last_enriched_at,
            created_at,
            updated_at
          )
        `)
        .eq('discovery_run_id', runId)
        .order('created_at', {
          ascending: true,
        })

      if (error) {
        console.error(
          'DISCOVERY BATCH ERROR:',
          error
        )

        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 500 }
        )
      }

      const schools = (data ?? [])
        .map((row: any) => row.schools)
        .filter(Boolean)

      return NextResponse.json({
        schools,
        count: schools.length,
        run_id: runId,
      })
    }

    /*
     * RECENT RESULTS
     *
     * Only schools updated recently.
     * This keeps Discover clean.
     */
    const recentCutoff = new Date(
      Date.now() -
        24 * 60 * 60 * 1000
    ).toISOString()

    const { data, error } = await db
      .from('schools')
      .select(`
        id,
        school_name,
        address,
        phone,
        website,
        lead_score,
        priority,
        status,
        is_lead,
        state_id,
        lga_id,
        city_id,
        area_id,
        last_discovery_run_id,
        enrichment_status,
        last_enriched_at,
        created_at,
        updated_at
      `)
      .gte(
        'updated_at',
        recentCutoff
      )
      .order('updated_at', {
        ascending: false,
      })
      .limit(300)

    if (error) {
      console.error(
        'RECENT DISCOVERY ERROR:',
        error
      )

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      schools: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (error: any) {
    console.error(
      'DISCOVERY GET EXCEPTION:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to load discovery results',
      },
      { status: 500 }
    )
  }
}