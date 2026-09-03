import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()

    const payload = await request.json()

    const schoolIds = Array.isArray(payload.school_ids)
      ? payload.school_ids.filter(
          (id: unknown): id is string =>
            typeof id === 'string'
        )
      : []

    const subject =
      typeof payload.subject === 'string'
        ? payload.subject.trim()
        : ''

    const bodyHtml =
      typeof payload.body_html === 'string'
        ? payload.body_html.trim()
        : ''

    const senderName =
      typeof payload.sender_name === 'string' &&
      payload.sender_name.trim()
        ? payload.sender_name.trim()
        : 'TheHandler'

    if (!schoolIds.length) {
      return NextResponse.json(
        { error: 'No schools selected.' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Email subject is required.' },
        { status: 400 }
      )
    }

    if (!bodyHtml) {
      return NextResponse.json(
        { error: 'Email body is required.' },
        { status: 400 }
      )
    }

    if (schoolIds.length > 10000) {
      return NextResponse.json(
        {
          error:
            'A single broadcast cannot exceed 10,000 recipients.',
        },
        { status: 400 }
      )
    }

    const { data: schools, error } = await db
      .from('schools')
      .select(`
        id,
        school_name,
        email,
        status
      `)
      .in('id', schoolIds)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const eligible = (schools || []).filter(
      (school) =>
        school.email?.trim() &&
        school.status !== 'DO_NOT_CONTACT'
    )

    if (!eligible.length) {
      return NextResponse.json(
        {
          error:
            'None of the selected schools have an eligible email address.',
        },
        { status: 400 }
      )
    }

    const { data: broadcast, error: broadcastError } =
      await db
        .from('broadcasts')
        .insert({
          subject,
          body_html: bodyHtml,
          sender_name: senderName,
          status: 'QUEUED',
          recipient_count: eligible.length,
        })
        .select('id')
        .single()

    if (broadcastError || !broadcast) {
      return NextResponse.json(
        {
          error:
            broadcastError?.message ||
            'Could not create broadcast.',
        },
        { status: 500 }
      )
    }

    const recipients = eligible.map((school) => ({
      broadcast_id: broadcast.id,
      school_id: school.id,
      email: school.email.trim(),
      status: 'QUEUED',
    }))

    const { error: recipientError } = await db
      .from('broadcast_recipients')
      .insert(recipients)

    if (recipientError) {
      await db
        .from('broadcasts')
        .delete()
        .eq('id', broadcast.id)

      return NextResponse.json(
        { error: recipientError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,

      broadcast_id: broadcast.id,

      status: 'QUEUED',

      recipient_count: eligible.length,

      message:
        'Broadcast queued successfully and is ready for background delivery.',
    })
  } catch (error) {
    console.error('Create broadcast error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create broadcast',
      },
      { status: 500 }
    )
  }
}