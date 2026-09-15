'use client'

import { useState } from 'react'

const DEFAULT_SUBJECT = 'A faster way to pull up {{school_name}}\'s records'

const DEFAULT_BODY =
  '<p>Dear {{school_name}} Management,</p><p>When a parent asks about a payment, or a staff member needs a student\'s attendance history, how long does it usually take to find? Often it means calling around or digging through files.</p><p><strong>TheHandler</strong> is the workspace your staff already use for their day-to-day work — not a separate system to re-enter records into afterward. As they carry out their normal tasks, payments, attendance, and student history are captured automatically and stay searchable in one place, in seconds.</p><p>We are inviting selected schools in Lagos to participate in the current rollout completely free of charge. This gives schools an opportunity to use the system while helping us refine it around real school operations.</p><p>I\'d like to show you how it would work for {{school_name}} — would Wednesday 2pm or Thursday 11am work for a 15-minute call?</p><p>If now isn\'t the right time, just reply "not now" and I won\'t follow up.</p><p>Kind regards,<br><strong>INNOCENT AMAECHI</strong><br>TheHandler<br>WhatsApp/Call: <a href="tel:+2348104945035">+234 810 494 5035</a><br><a href="https://thehandler.xyz">thehandler.xyz</a></p>'

export default function TestSendPage() {
  const [email, setEmail] = useState('')
  const [senderName, setSenderName] = useState('TheHandler')
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [schoolName, setSchoolName] = useState('Test School Lagos')

  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(true)

  const previewSubject = subject.replaceAll('{{school_name}}', schoolName || 'School Name')
  const previewBody = body.replaceAll('{{school_name}}', schoolName || 'School Name')

  async function sendTest() {
    if (!email.trim()) {
      setMessageOk(false)
      setMessage('Enter an email address first.')
      return
    }

    setSending(true)
    setMessage('')

    try {
      const response = await fetch('/api/distribution/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          subject,
          body_html: body,
          sender_name: senderName,
          school_name: schoolName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      setMessageOk(true)
      setMessage(`Test email sent to ${email.trim()}. Check your inbox (and spam).`)
    } catch (error) {
      setMessageOk(false)
      setMessage(error instanceof Error ? error.message : 'Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4ecd9] p-6 text-[#11100d]">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-semibold">Test send</h1>
        <p className="mb-6 text-sm text-slate-500">
          Fires one real email through Resend so you can see exactly what a school
          will receive — subject, body, and how {'{{school_name}}'} renders.
        </p>

        {message && (
          <div
            className={`mb-5 rounded-xl px-4 py-3 text-sm ${
              messageOk
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message}
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Send test to
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                From name
              </label>
              <input
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Test school name ({'{{school_name}}'})
              </label>
              <input
                value={schoolName}
                onChange={(event) => setSchoolName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Subject
            </label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Body (HTML)
            </label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-[#101216] px-3 py-3 font-mono text-[11px] leading-6 text-slate-200 outline-none focus:border-slate-400"
            />
          </div>

          <button
            onClick={sendTest}
            disabled={sending}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? 'Sending…' : 'Send test email'}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-500">
            Preview
          </div>
          <div className="px-5 py-4">
            <div className="mb-3 text-sm font-semibold">{previewSubject}</div>
            <div
              className="prose prose-sm max-w-none text-xs"
              dangerouslySetInnerHTML={{ __html: previewBody }}
            />
          </div>
        </div>
      </div>
    </main>
  )
}