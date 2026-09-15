import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'TheHandler <outreach@scrapthehandler.site>'

function personalize(html: string, vars: Record<string, string>) {
  let out = html
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value)
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    const to = typeof payload.email === 'string' ? payload.email.trim() : ''
    const subject =
      typeof payload.subject === 'string' ? payload.subject.trim() : ''
    const bodyHtml =
      typeof payload.body_html === 'string' ? payload.body_html.trim() : ''
    const senderName =
      typeof payload.sender_name === 'string' && payload.sender_name.trim()
        ? payload.sender_name.trim()
        : 'TheHandler'

    if (!to) {
      return NextResponse.json(
        { error: 'Enter an email address to send the test to.' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required.' },
        { status: 400 }
      )
    }

    if (!bodyHtml) {
      return NextResponse.json(
        { error: 'Message body is required.' },
        { status: 400 }
      )
    }

    const fromAddress = RESEND_FROM_EMAIL.match(/<(.+)>/)?.[1] || RESEND_FROM_EMAIL

    // Fake school data so {{school_name}} / {{status}} render something
    // real instead of showing up blank or literal in your inbox.
    const vars = {
      school_name: payload.school_name?.trim() || 'Test School Lagos',
      status: payload.status?.trim() || 'NEW',
    }

    const { data, error } = await resend.emails.send({
      from: `${senderName} <${fromAddress}>`,
      to,
      subject: personalize(subject, vars),
      html: personalize(bodyHtml, vars),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to send test email',
      },
      { status: 500 }
    )
  }
}