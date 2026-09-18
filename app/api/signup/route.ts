import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit, requestIp } from '@/lib/rate-limit'

const signupSchema = z.object({
  name: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().min(2).max(120),
  ),
  email: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''),
    z.string().email().max(254),
  ),
  role: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().min(2).max(80),
  ),
  programName: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().min(2).max(140),
  ),
  athleteCount: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().min(1).max(40),
  ),
  primaryGoal: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().min(2).max(140),
  ),
})

const APP_NAME = 'Hoopstrack'
const NOTIFY_EMAIL = process.env.WAITLIST_NOTIFY_EMAIL || 'khouston@thebasketballfactorynj.com'

type SignupLead = z.infer<typeof signupSchema>

function textLines(data: SignupLead, source: string) {
  return [
    `New ${APP_NAME} waiting list signup`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Role: ${data.role}`,
    `Program: ${data.programName}`,
    `Athlete count: ${data.athleteCount}`,
    `Primary goal: ${data.primaryGoal}`,
    `Source: ${source}`,
  ].join('\n')
}

async function sendWaitlistEmail(data: SignupLead, source: string) {
  if (!process.env.RESEND_API_KEY) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.WAITLIST_FROM_EMAIL || 'Hoopstrack Waitlist <onboarding@resend.dev>',
      to: NOTIFY_EMAIL,
      subject: `${APP_NAME} waitlist signup: ${data.name}`,
      text: textLines(data, source),
    }),
  }).catch((error) => console.error('waitlist email failed', error))
}

async function mirrorToKevinclaw(data: SignupLead, request: Request, source: string) {
  const url = process.env.KEVINCLAW_WAITLIST_WEBHOOK_URL
  if (!url) return

  await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.KEVINCLAW_WAITLIST_WEBHOOK_TOKEN
        ? { authorization: `Bearer ${process.env.KEVINCLAW_WAITLIST_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      app: APP_NAME,
      name: data.name,
      email: data.email,
      source,
      referrer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      ipAddress:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        null,
      metadata: {
        role: data.role,
        programName: data.programName,
        athleteCount: data.athleteCount,
        primaryGoal: data.primaryGoal,
      },
    }),
  }).catch((error) => console.error('Kevinclaw waitlist mirror failed', error))
}

function signupRedirect(request: Request, status: 'joined' | 'check') {
  const fallback = new URL(request.url)
  const origin = request.headers.get('origin')
  const publicOrigin = origin && !origin.includes('localhost') ? origin : null
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? fallback.host
  const proto = request.headers.get('x-forwarded-proto') ?? fallback.protocol.replace(':', '') ?? 'https'
  const url = new URL('/signup', publicOrigin ?? `${proto}://${host}`)
  url.searchParams.set('signup', status)
  return url
}

function ensureSignupTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS signup_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      program_name TEXT NOT NULL,
      athlete_count TEXT NOT NULL,
      primary_goal TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_signup_leads_created ON signup_leads(created_at DESC);
  `)
}

export async function POST(request: Request) {
  const limited = rateLimit(`signup:${requestIp(request)}`, 10, 15 * 60 * 1000)
  if (limited) return limited

  try {
    ensureSignupTable()

    const form = await request.formData()
    const data = signupSchema.parse({
      name: form.get('name'),
      email: form.get('email'),
      role: form.get('role'),
      programName: form.get('programName'),
      athleteCount: form.get('athleteCount'),
      primaryGoal: form.get('primaryGoal'),
    })

    db.prepare(`
      INSERT INTO signup_leads (name, email, role, program_name, athlete_count, primary_goal)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        program_name = excluded.program_name,
        athlete_count = excluded.athlete_count,
        primary_goal = excluded.primary_goal,
        updated_at = datetime('now')
    `).run(
      data.name,
      data.email,
      data.role,
      data.programName,
      data.athleteCount,
      data.primaryGoal,
    )

    await Promise.all([
      sendWaitlistEmail(data, 'signup-page'),
      mirrorToKevinclaw(data, request, 'signup-page'),
    ])

    return NextResponse.redirect(signupRedirect(request, 'joined'), 303)
  } catch (error) {
    console.error('SIGNUP ERROR:', error)
    return NextResponse.redirect(signupRedirect(request, 'check'), 303)
  }
}
