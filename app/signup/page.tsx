import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Building2, Check, Mail, Target, UserRound, Users } from 'lucide-react'
import { CourtBackdrop, Wordmark } from '@/components/ht/brand'

export const metadata: Metadata = {
  title: 'Join Hoopstrack | Sign Up',
  description: 'Sign up for Hoopstrack connected basketball training.',
}

type SignupPageProps = {
  searchParams?: Promise<{ signup?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const signupStatus = params?.signup === 'joined' || params?.signup === 'check' ? params.signup : undefined

  return (
    <main className="ht-ui landing-court-stage relative min-h-screen overflow-hidden text-ht-ink">
      <CourtBackdrop className="opacity-80" />

      <section className="relative z-10 mx-auto grid min-h-screen max-w-[1520px] items-center gap-10 px-6 py-10 lg:grid-cols-[0.48fr_0.52fr] lg:px-9">
        <div className="landing-rise">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-ht-line bg-white px-4 py-2 text-[14px] text-ht-muted shadow-[0_12px_34px_rgba(10,10,10,0.05)] transition-colors hover:border-ht-orange hover:text-ht-orange"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <div className="mt-12">
            <Wordmark tone="light" markClassName="text-[42px] sm:text-[54px]" />
          </div>

          <p className="ht-heading mt-10 text-[18px] tracking-[0.16em] text-ht-orange">Hoopstrack sign up</p>
          <h1 className="ht-heading mt-5 max-w-[700px] text-[58px] leading-[0.9] tracking-[0.02em] text-ht-ink sm:text-[78px] lg:text-[82px]">
            Get Hoopstrack first.
          </h1>
          <p className="mt-5 max-w-[610px] text-[20px] leading-8 text-ht-muted">
            Sign up for the iOS player app and desktop coach dashboard.
          </p>

          <div className="mt-7 space-y-4 text-[17px] text-ht-ink">
            {[
              'Player workouts, rep capture, and progress tracking.',
              'Coach planning, film review, and team accountability.',
              'One connected basketball training workflow.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-ht-orange text-ht-orange">
                  <Check className="size-4" strokeWidth={2.3} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-rise landing-delay-1">
          <div className="mx-auto max-w-[640px] rounded-2xl border border-ht-line bg-white p-5 shadow-[0_28px_90px_rgba(10,10,10,0.12)] sm:p-7">
            <div className="rounded-xl bg-ht-ink p-6 text-white sm:p-8">
              <p className="ht-heading text-[18px] tracking-[0.14em] text-ht-orange">Create your request</p>
              <h2 className="ht-heading mt-3 text-[42px] leading-[0.9] tracking-[0.02em] sm:text-[56px]">
                Tell us how you&apos;ll use it.
              </h2>
              <p className="mt-4 text-[16px] leading-7 text-white/64">
                This helps us set up the right player and coach workflow for your program.
              </p>

              <form action="/api/signup" method="post" className="mt-7 grid gap-4">
                <label className="relative block">
                  <span className="sr-only">Name</span>
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-white/42" strokeWidth={1.8} />
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Name"
                    suppressHydrationWarning
                    className="h-16 w-full rounded-xl border border-white/14 bg-white/8 pl-14 pr-4 text-[20px] text-white outline-none transition-colors placeholder:text-white/38 focus:border-ht-orange"
                  />
                </label>
                <label className="relative block">
                  <span className="sr-only">Email</span>
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-white/42" strokeWidth={1.8} />
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Email"
                    suppressHydrationWarning
                    className="h-16 w-full rounded-xl border border-white/14 bg-white/8 pl-14 pr-4 text-[20px] text-white outline-none transition-colors placeholder:text-white/38 focus:border-ht-orange"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="relative block">
                    <span className="sr-only">Role</span>
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-white/42" strokeWidth={1.8} />
                    <select
                      name="role"
                      required
                      defaultValue=""
                      className="h-16 w-full appearance-none rounded-xl border border-white/14 bg-white/8 pl-14 pr-10 text-[18px] text-white outline-none transition-colors focus:border-ht-orange"
                    >
                      <option value="" disabled>Role</option>
                      <option value="Coach">Coach</option>
                      <option value="Player">Player</option>
                      <option value="Trainer">Trainer</option>
                      <option value="Parent">Parent</option>
                      <option value="Program Director">Program Director</option>
                    </select>
                  </label>
                  <label className="relative block">
                    <span className="sr-only">Athlete count</span>
                    <Users className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-white/42" strokeWidth={1.8} />
                    <select
                      name="athleteCount"
                      required
                      defaultValue=""
                      className="h-16 w-full appearance-none rounded-xl border border-white/14 bg-white/8 pl-14 pr-10 text-[18px] text-white outline-none transition-colors focus:border-ht-orange"
                    >
                      <option value="" disabled>Athletes</option>
                      <option value="1 athlete">1 athlete</option>
                      <option value="2-10 athletes">2-10 athletes</option>
                      <option value="11-25 athletes">11-25 athletes</option>
                      <option value="26-75 athletes">26-75 athletes</option>
                      <option value="75+ athletes">75+ athletes</option>
                    </select>
                  </label>
                </div>
                <label className="relative block">
                  <span className="sr-only">Team or program</span>
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-white/42" strokeWidth={1.8} />
                  <input
                    name="programName"
                    required
                    autoComplete="organization"
                    placeholder="Team, school, or program"
                    suppressHydrationWarning
                    className="h-16 w-full rounded-xl border border-white/14 bg-white/8 pl-14 pr-4 text-[20px] text-white outline-none transition-colors placeholder:text-white/38 focus:border-ht-orange"
                  />
                </label>
                <label className="relative block">
                  <span className="sr-only">Primary goal</span>
                  <Target className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-white/42" strokeWidth={1.8} />
                  <select
                    name="primaryGoal"
                    required
                    defaultValue=""
                    className="h-16 w-full appearance-none rounded-xl border border-white/14 bg-white/8 pl-14 pr-10 text-[18px] text-white outline-none transition-colors focus:border-ht-orange"
                  >
                    <option value="" disabled>Main goal</option>
                    <option value="Track player progress">Track player progress</option>
                    <option value="Assign workouts">Assign workouts</option>
                    <option value="Review film">Review film</option>
                    <option value="Build practice plans">Build practice plans</option>
                    <option value="Run a full team workflow">Run a full team workflow</option>
                  </select>
                </label>
                <button
                  type="submit"
                  className="ht-heading landing-button-shine mt-1 inline-flex h-16 items-center justify-center gap-4 rounded-xl bg-ht-orange px-6 text-[24px] tracking-[0.03em] text-white shadow-[0_18px_44px_rgba(254,72,0,0.28)] transition-colors hover:bg-ht-orange-hover"
                >
                  SIGN UP
                  <ArrowRight className="size-7" />
                </button>
              </form>

              {signupStatus ? (
                <p className={`mt-5 rounded-xl border px-4 py-3 text-[16px] ${signupStatus === 'joined' ? 'border-ht-orange/40 bg-ht-orange/10 text-ht-orange' : 'border-white/12 bg-white/8 text-white/70'}`}>
                  {signupStatus === 'joined'
                    ? "You're signed up for Hoopstrack."
                    : 'Check your name and email, then try again.'}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
