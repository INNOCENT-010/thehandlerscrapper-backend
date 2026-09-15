import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

type RequestedRecipient = {
  school_id: string
  email: string
}

// Self-hosted Mailroom isn't live yet, so broadcasts are sent through
// Resend for now. Once Mailroom is ready, recipients can go back to
// staying 'QUEUED' for it to pick up in the background — that path is
// still here (see deliveryMethod below), just not wired to anything yet.
const resend = new Resend(process.env.RESEND_API_KEY)
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'TheHandler <hello@thehandler.xyz>'
const RESEND_BATCH_SIZE = 100 // Resend's batch.send() limit per call

function personalize(html: string, vars: Record<string, string>) {
  let out = html
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value)
  }
  return out
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()

    const payload = await request.json()

    const requestedRecipients: RequestedRecipient[] = Array.isArray(payload.recipients)
      ? (payload.recipients as unknown[]).filter(
          (recipient: unknown): recipient is RequestedRecipient =>
            Boolean(
              recipient &&
              typeof recipient === 'object' &&
              typeof (recipient as { school_id?: unknown }).school_id === 'string' &&
              typeof (recipient as { email?: unknown }).email === 'string'
            )
        )
      : []

    const schoolIds = requestedRecipients.length
      ? [...new Set(requestedRecipients.map((recipient) => recipient.school_id))]
      : Array.isArray(payload.school_ids)
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

    // 'resend' is the only live option right now — 'internal' is
    // accepted so the frontend can send it, but it isn't wired to
    // anything yet since Mailroom isn't ready.
    const deliveryMethod: 'resend' | 'internal' =
      payload.delivery_method === 'internal' ? 'internal' : 'resend'

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

    if (deliveryMethod === 'internal') {
      return NextResponse.json(
        {
          error:
            'Self-hosted Mailroom is not available yet. Send via Resend instead.',
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

    const { data: contacts, error: contactsError } = await db
      .from('school_contacts')
      .select('school_id,email,opted_out')
      .in('school_id', schoolIds)
      .not('email', 'is', null)

    if (contactsError) {
      return NextResponse.json(
        { error: contactsError.message },
        { status: 500 }
      )
    }

    const allowedEmails = new Map<string, Set<string>>()
    for (const school of schools || []) {
      const set = new Set<string>()
      if (school.email?.trim()) set.add(school.email.trim().toLowerCase())
      allowedEmails.set(school.id, set)
    }
    for (const contact of contacts || []) {
      if (contact.opted_out || !contact.email?.trim()) continue
      allowedEmails.get(contact.school_id)?.add(contact.email.trim().toLowerCase())
    }

    const selectedEmailBySchool = new Map(
      requestedRecipients.map((recipient) => [
        recipient.school_id,
        recipient.email.trim().toLowerCase(),
      ])
    )

    const eligible = (schools || []).flatMap((school) => {
      if (school.status === 'DO_NOT_CONTACT') return []
      const selectedEmail = selectedEmailBySchool.get(school.id)
      const email = selectedEmail || school.email?.trim().toLowerCase()
      if (!email || !allowedEmails.get(school.id)?.has(email)) return []
      return [{ ...school, selected_email: email }]
    })

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
          status: 'SENDING',
          recipient_count: eligible.length,
          started_at: new Date().toISOString(),
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
      email: school.selected_email,
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

    // --- Send now via Resend -------------------------------------
    const fromAddress = RESEND_FROM_EMAIL.match(/<(.+)>/)?.[1] || RESEND_FROM_EMAIL

    let sentCount = 0
    let failedCount = 0
    const statusUpdates: Array<{ school_id: string; status: string; error?: string }> = []

    for (const batch of chunk(eligible, RESEND_BATCH_SIZE)) {
      const emails = batch.map((school) => ({
        from: `${senderName} <${fromAddress}>`,
        to: school.selected_email,
        subject,
        html: personalize(bodyHtml, {
          school_name: school.school_name || 'School',
          status: school.status || 'NEW',
        }),
      }))

      const { data: results, error: sendError } = await resend.batch.send(emails)

      if (sendError) {
        failedCount += batch.length
        for (const school of batch) {
          statusUpdates.push({
            school_id: school.id,
            status: 'FAILED',
            error: sendError.message,
          })
        }
        continue
      }

      batch.forEach((school, index) => {
        const result = results?.data?.[index]
        if (result?.id) {
          sentCount += 1
          statusUpdates.push({ school_id: school.id, status: 'SENT' })
        } else {
          failedCount += 1
          statusUpdates.push({ school_id: school.id, status: 'FAILED' })
        }
      })
    }

    // Flip each recipient row from QUEUED to SENT/FAILED.
    await Promise.all(
      statusUpdates.map((update) =>
        db
          .from('broadcast_recipients')
          .update({
            status: update.status,
            ...(update.error ? { error: update.error } : {}),
          })
          .eq('broadcast_id', broadcast.id)
          .eq('school_id', update.school_id)
      )
    )

    const finalStatus =
      failedCount === 0 ? 'SENT' : sentCount === 0 ? 'FAILED' : 'PARTIAL'

    await db
      .from('broadcasts')
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', broadcast.id)

    return NextResponse.json({
      ok: true,

      broadcast_id: broadcast.id,

      status: finalStatus,

      recipient_count: eligible.length,

      sent_count: sentCount,

      failed_count: failedCount,

      message:
        failedCount === 0
          ? `Broadcast sent to ${sentCount} recipients via Resend.`
          : `Broadcast sent to ${sentCount} recipients via Resend (${failedCount} failed).`,
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