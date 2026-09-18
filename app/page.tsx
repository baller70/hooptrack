import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Film,
  Flame,
  Monitor,
  Sparkles,
  Smartphone,
  SquarePlay,
  Target,
  UserRound,
  Users,
  Video,
  Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CourtBackdrop, Wordmark } from '@/components/ht/brand'

export const metadata: Metadata = {
  title: 'Hoopstrack | Connected Basketball Training',
  description:
    'A player app and coach app for connected basketball training: capture reps, assign workouts, review film, and track progress.',
}

const navLinks = [
  { label: 'PLAYER APP', href: '#player-app' },
  { label: 'COACH APP', href: '#coach-app' },
  { label: 'FILM REVIEW', href: '#coach-app' },
]

const appLoginUrl = 'https://hoopstracker.site/login'
const signupUrl = '/signup'

const heroMetrics = [
  { icon: Film, value: '28', label: 'Clips Reviewed' },
  { icon: ClipboardList, value: '6', label: 'Workouts This Week' },
  { icon: Target, value: '92%', label: 'Shooting Focus' },
]

const playerProof = [
  {
    title: '01 / Follow the plan',
    body: "Open today's training plan with due dates, rep targets, coach notes, and the next drill already queued.",
  },
  {
    title: '02 / Capture the work',
    body: 'Record reps, upload from gallery, tag the drill, and send coach-ready video without chasing files.',
  },
  {
    title: '03 / See what changed',
    body: 'Watch streaks, grades, weak areas, and best clips turn into a clear progress story.',
  },
]

export default function HomePage() {
  return (
    <main className="ht-ui landing-court-stage relative min-h-screen overflow-hidden text-ht-ink">
      <CourtBackdrop className="opacity-80" />
      <LandingHeader />
      <ScreenOne />
      <ScreenTwo />
      <ScreenThree />
      <LandingFooter />
    </main>
  )
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ht-ink/96 shadow-[0_16px_50px_rgba(10,10,10,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex h-[78px] max-w-[1520px] items-center gap-5 px-6 lg:px-9">
        <Link href="/" aria-label="Hoopstrack home" className="shrink-0">
          <Wordmark tone="dark" markClassName="text-[34px] sm:text-[42px]" />
        </Link>

        <nav className="ht-heading mx-auto hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[14px] tracking-[0.1em] text-white/78 lg:flex">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="rounded-full px-4 py-2 transition-colors hover:bg-white/10 hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href={appLoginUrl}
            className="ht-heading hidden h-11 items-center justify-center rounded-lg px-4 text-[13px] tracking-[0.1em] text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            SIGN IN
          </Link>
          <Link
            href={signupUrl}
            className="ht-heading landing-button-shine inline-flex h-11 items-center justify-center rounded-lg border border-ht-orange bg-ht-orange px-4 text-[13px] tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(254,72,0,0.28)] transition-colors hover:bg-ht-orange-hover sm:px-6"
          >
            GET STARTED
          </Link>
        </div>
      </div>
    </header>
  )
}

function ScreenOne() {
  return (
    <section className="landing-hero-section relative z-10 overflow-visible">
      <div className="mx-auto grid min-h-[calc(100svh-78px)] max-w-[1760px] items-center gap-7 px-6 pb-24 pt-8 sm:pb-28 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] lg:px-9 lg:pb-14 lg:pt-9">
        <div className="landing-rise relative z-10 flex min-w-0 flex-col justify-center">
          <p className="ht-heading text-[18px] tracking-[0.12em] text-ht-orange">
            Built for player + coach workflows
          </p>
          <h1 className="ht-heading mt-6 max-w-[760px] text-[58px] leading-[0.9] tracking-[0.02em] text-ht-ink sm:text-[80px] lg:max-w-[860px] lg:text-[72px] xl:text-[82px] 2xl:text-[88px]">
            <span className="block lg:whitespace-nowrap">Every rep captured.</span>
            <span className="block lg:whitespace-nowrap">Every player coached.</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-[20px] leading-8 text-ht-muted">
            Record drills, assign workouts, review film, track progress, and keep athletes accountable from phone to sideline.
          </p>

          <div className="mt-5 flex items-center gap-3 text-[17px] text-ht-ink">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-ht-orange text-ht-orange">
              <Check className="size-5" strokeWidth={2.3} />
            </span>
            <span>Players record. Coaches assign. Teams improve.</span>
          </div>

          <AvailabilityCards className="mt-7 max-w-[620px]" />

          <div className="mt-8 grid max-w-[620px] grid-cols-3 overflow-hidden rounded-xl border border-ht-line bg-white">
            {heroMetrics.map((metric, index) => (
              <MetricCell key={metric.label} {...metric} divided={index > 0} />
            ))}
          </div>
        </div>

        <div className="landing-rise landing-delay-1 relative flex min-h-[430px] min-w-0 items-center sm:min-h-[520px] lg:min-h-[590px] xl:min-h-[640px]">
          <HeroProductShowcase />
        </div>
      </div>
    </section>
  )
}

function ScreenTwo() {
  return (
    <section id="player-app" className="landing-court-panel landing-reveal-section landing-reveal-player relative z-20 -mt-14 overflow-visible px-6 pb-12 pt-24 backdrop-blur lg:-mt-20 lg:px-9 lg:pb-14 lg:pt-28">
      <div className="mx-auto grid min-h-[calc(100svh-78px)] max-w-[1520px] items-center gap-7 lg:grid-cols-[0.43fr_0.24fr_0.33fr] lg:gap-x-7">
        <div className="landing-rise flex min-w-0 flex-col justify-center lg:min-h-[940px] lg:justify-start">
          <p className="ht-heading text-[20px] tracking-[0.18em] text-ht-orange">Player App</p>
          <h2 className="ht-heading mt-5 max-w-[720px] text-[44px] leading-[0.94] tracking-[0.01em] text-ht-ink sm:text-[58px] lg:text-[54px] xl:text-[60px] 2xl:text-[66px]">
            <span className="block lg:whitespace-nowrap">Know the work. Capture the rep.</span>
            <span className="block lg:whitespace-nowrap">Prove the progress.</span>
          </h2>
          <p className="mt-4 max-w-[560px] text-[19px] leading-7 text-ht-muted">
            Follow assigned workouts, study moves, upload clips, and see training turn into streaks, hours, grades, and recordings.
          </p>

          <div className="mt-6 rounded-xl border border-ht-line bg-white p-5 md:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:gap-5">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-ht-orange-soft text-ht-orange">
                <CalendarDays className="size-6" strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="text-[25px] leading-7 text-ht-ink md:text-[23px]">Today is already organized</h3>
                <p className="mt-2 text-[18px] leading-7 text-ht-muted md:mt-1 md:text-[16px] md:leading-6">
                  Assigned workouts, team requests, move study, training plan, and progress live in one player view.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-3 md:gap-3 lg:grid-cols-3">
            {playerProof.map((item, index) => (
              <div
                key={item.title}
                className="group overflow-hidden rounded-xl border border-ht-line bg-white shadow-[0_14px_44px_rgba(10,10,10,0.055)] transition-all hover:-translate-y-1 hover:border-ht-orange/50 hover:shadow-[0_22px_64px_rgba(10,10,10,0.09)]"
              >
                <div className="p-5 md:p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="ht-heading min-w-0 whitespace-nowrap text-[24px] leading-none text-ht-ink md:text-[13px] xl:text-[14px]">
                      <span className="text-ht-orange">{item.title.split('/')[0]} /</span>
                      {item.title.split('/')[1]}
                    </h3>
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-ht-orange-soft text-ht-orange md:size-7">
                      {index === 0 ? <ClipboardList className="size-6 md:size-3.5" /> : index === 1 ? <Camera className="size-6 md:size-3.5" /> : <BarChart3 className="size-6 md:size-3.5" />}
                    </span>
                  </div>
                </div>
                <ProofVisual index={index} />
                <div className="p-5 pt-5 md:p-3 md:pt-3">
                  <p className="text-[20px] leading-8 text-ht-muted md:text-[13px] md:leading-5">{item.body}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-ht-chip px-4 py-2 text-[14px] text-ht-ink md:px-2.5 md:py-1 md:text-[10px]">
                      {index === 0 ? 'Ready today' : index === 1 ? 'Coach-ready' : 'Progress visible'}
                    </span>
                    <ArrowRight className="size-7 text-ht-orange transition-transform group-hover:translate-x-1 md:size-5" strokeWidth={2} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <AvailabilityCards className="mt-6 max-w-[620px]" />

          <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-ht-line bg-white md:grid-cols-4">
            <TrustCell icon={Wifi} label="Offline-capable PWA" />
            <TrustCell icon={Bell} label="Web push reminders" divided />
            <TrustCell icon={Users} label="Player + coach connected" divided />
            <TrustCell icon={SquarePlay} label="Video-first history" divided />
          </div>
        </div>

        <div className="landing-rise landing-delay-1 flex items-center justify-center lg:-mt-20">
          <PlayerWorkoutsPhone />
        </div>

        <div className="landing-rise landing-delay-2 grid content-center gap-4">
          <TrainingPlanPanel />
          <ProgressSnapshotPanel />
          <ProgressReportPanel />
          <MoveLibraryPanel />
        </div>
      </div>
    </section>
  )
}

function ScreenThree() {
  return (
    <section id="coach-app" className="landing-court-panel landing-reveal-section landing-reveal-coach relative z-10 -mt-14 overflow-hidden px-6 pb-8 pt-24 backdrop-blur lg:-mt-20 lg:px-9 lg:pb-9 lg:pt-28">
      <div className="mx-auto grid min-h-[calc(100svh-78px)] max-w-[1520px] items-center gap-8 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] xl:gap-10 2xl:max-w-[2280px] 2xl:grid-cols-[minmax(0,0.32fr)_minmax(0,0.68fr)] 2xl:px-8">
        <div className="landing-rise relative z-20 min-w-0">
          <p className="ht-heading text-[20px] tracking-[0.18em] text-ht-orange">Coach App</p>
          <h2 className="ht-heading mt-5 max-w-[600px] text-[44px] leading-[0.94] tracking-[0.01em] text-ht-ink sm:text-[58px] lg:text-[54px] xl:text-[60px] 2xl:text-[66px]">
            <span className="block lg:whitespace-nowrap">Built for basketball.</span>
            <span className="block lg:whitespace-nowrap">Driven by reps.</span>
          </h2>
          <p className="mt-4 max-w-[440px] text-[18px] leading-7 text-ht-muted">
            Plan the week, review player clips, track weak areas, and close the loop from one connected coaching command center.
          </p>

          <AvailabilityCards className="mt-5 max-w-[500px]" />

          <div className="mt-7 max-w-[430px] space-y-5 border-l border-ht-line pl-5">
            {[
              { icon: CalendarDays, title: 'Plan the week', body: 'Build groups, assign focus areas, and line up the next practice.' },
              { icon: Sparkles, title: 'Coach the rep', body: 'Tag film, leave feedback, and make every player see the correction.' },
              { icon: BarChart3, title: 'Publish the progress', body: 'Turn clips, grades, and weak areas into the next training plan.' },
            ].map((step, index) => (
              <BasketballStep key={step.title} step={step} index={index} />
            ))}
          </div>
        </div>

        <div className="landing-rise landing-delay-1 relative flex min-h-[360px] min-w-0 items-center lg:min-h-[620px] xl:min-h-[700px]">
          <BuiltForBasketballShowcase />
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-ht-ink px-6 py-10 text-white lg:px-9">
      <div className="mx-auto max-w-[1520px]">
        <div className="grid gap-9 border-b border-white/10 pb-9 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr] lg:gap-12">
          <div className="max-w-[390px]">
            <FooterWordmark />
            <p className="mt-4 text-[15px] leading-6 text-white/62">
              Connected basketball training for players, coaches, and teams.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: 'Player App', href: '#player-app' },
              { label: 'Coach App', href: '#coach-app' },
              { label: 'Film Review', href: '#coach-app' },
            ]}
          />
          <FooterColumn
            title="Platform"
            links={[
              { label: 'iOS Workflows', href: '#player-app' },
              { label: 'Desktop Dashboard', href: '#coach-app' },
              { label: 'Progress Reports', href: '#player-app' },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { label: 'Sign In', href: appLoginUrl },
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Support', href: '/support' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[13px] text-white/46 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Hoopstrack. All rights reserved.</p>
          <p className="ht-heading tracking-[0.12em] text-white/38">BUILT FOR BASKETBALL TRAINING</p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="ht-heading text-[14px] tracking-[0.14em] text-white">{title}</h3>
      <div className="mt-4 grid gap-3">
        {links.map((link) => (
          <FooterLink key={`${title}-${link.label}`} href={link.href}>
            {link.label}
          </FooterLink>
        ))}
      </div>
    </div>
  )
}

function FooterWordmark() {
  return (
    <div className="ht-display select-none text-[36px] leading-[0.88] tracking-[-0.012em]">
      <span className="text-white">HOOPS</span>
      <span className="text-ht-orange">TRACK</span>
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[15px] leading-none text-white/62 transition-colors hover:text-white">
      {children}
    </Link>
  )
}

function AvailabilityLinkCard({
  href,
  icon: Icon,
  label,
  variant,
  className = '',
}: {
  href: string
  icon: LucideIcon
  label: string
  variant: 'solid' | 'outline'
  className?: string
}) {
  const solid = variant === 'solid'

  return (
    <Link
      href={href}
      className={`group landing-button-shine flex h-14 min-w-0 items-center gap-2 rounded-full border px-2.5 shadow-[0_14px_38px_rgba(10,10,10,0.06)] transition-transform hover:-translate-y-0.5 sm:h-16 sm:gap-3 sm:px-4 ${
        solid
          ? 'border-ht-orange bg-ht-orange text-white shadow-[0_16px_36px_rgba(254,72,0,0.22)]'
          : 'border-ht-ink bg-white text-ht-ink hover:bg-ht-chip'
      } ${className}`}
    >
      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full sm:size-11 ${solid ? 'bg-white/16' : 'bg-ht-chip'}`}>
        <Icon className="size-[18px] sm:size-6" strokeWidth={2.1} />
      </span>
      <span className="min-w-0">
        <span className="block whitespace-nowrap text-[14px] font-bold leading-none sm:text-[17px] lg:text-[16px] xl:text-[18px]">{label}</span>
      </span>
      <ArrowRight className="ml-auto size-4 shrink-0 transition-transform group-hover:translate-x-1 sm:size-6 lg:size-5 xl:size-6" />
    </Link>
  )
}

function AvailabilityCards({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <AvailabilityLinkCard
        href={signupUrl}
        icon={Smartphone}
        label="On iOS"
        variant="solid"
      />
      <AvailabilityLinkCard
        href={signupUrl}
        icon={Monitor}
        label="On Desktop"
        variant="outline"
      />
    </div>
  )
}

function MetricCell({
  icon: Icon,
  value,
  label,
  divided,
}: {
  icon: LucideIcon
  value: string
  label: string
  divided?: boolean
}) {
  return (
    <div className={`p-5 text-center ${divided ? 'border-l border-ht-line-soft' : ''}`}>
      <Icon className="mx-auto size-8 text-ht-orange" strokeWidth={1.8} />
      <p className="ht-num mt-4 text-[44px] leading-none text-ht-ink">{value}</p>
      <p className="mt-1 text-[14px] text-ht-muted">{label}</p>
    </div>
  )
}

function HeroProductShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-[760px] py-4 lg:-ml-8 lg:w-[106%] lg:max-w-none xl:-ml-10 xl:w-[108%] 2xl:-ml-12 2xl:w-[106%]">
      <Image
        src="/landing/hoopstrack-hero-imagegen-selected.png"
        alt="Hoopstrack player and coach app screens"
        width={1536}
        height={1024}
        priority
        sizes="(max-width: 1024px) 100vw, 56vw"
        className="h-auto w-full object-contain"
      />
    </div>
  )
}

function BasketballStep({
  step,
  index,
}: {
  step: { icon: LucideIcon; title: string; body: string }
  index: number
}) {
  const Icon = step.icon
  return (
    <div className="relative pl-5">
      <span className="absolute -left-[33px] top-0 flex size-8 items-center justify-center rounded-full bg-ht-orange text-white shadow-[0_12px_28px_rgba(254,72,0,0.25)]">
        {index + 1}
      </span>
      <div className="flex gap-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-ht-orange-soft text-ht-orange">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="ht-heading whitespace-nowrap text-[23px] leading-none text-ht-ink">{step.title}</h3>
          <p className="mt-1 text-[14px] leading-5 text-ht-muted">{step.body}</p>
        </div>
      </div>
    </div>
  )
}

function BuiltForBasketballShowcase() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center overflow-visible py-4 lg:-ml-4 lg:w-[108%] xl:-ml-8 xl:w-[112%] 2xl:-ml-10 2xl:w-[110%]">
      <Image
        src="/landing/hoopstrack-coach-workflow-imagegen.png"
        alt="Hoopstrack coach workflow app screens"
        width={1536}
        height={1024}
        sizes="(max-width: 1024px) 100vw, 66vw"
        className="h-auto w-full object-contain drop-shadow-[0_28px_70px_rgba(10,10,10,0.12)]"
      />
    </div>
  )
}

function TrustCell({
  icon: Icon,
  label,
  divided,
}: {
  icon: LucideIcon
  label: string
  divided?: boolean
}) {
  return (
    <div className={`p-5 text-center ${divided ? 'border-l border-ht-line-soft' : ''}`}>
      <Icon className="mx-auto size-8 text-ht-orange" strokeWidth={1.7} />
      <p className="mt-3 text-[13px] leading-5 text-ht-ink">{label}</p>
    </div>
  )
}

function PlayerWorkoutsPhone() {
  return (
    <div className="landing-float aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-2xl border border-ht-line bg-white shadow-[0_30px_90px_rgba(10,10,10,0.18)] xl:max-w-[320px]">
      <div className="flex h-full flex-col overflow-hidden bg-white">
        <div className="flex items-center justify-between px-5 pt-5">
          <Wordmark markClassName="text-[25px]" />
          <Bell className="size-5 text-ht-ink" />
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <div className="overflow-hidden rounded-2xl border border-ht-line bg-ht-ink text-white shadow-[0_18px_48px_rgba(10,10,10,0.18)]">
            <div className="relative h-[150px] xl:h-[162px]">
              <Image
                src="/landing/finishing-drive.png"
                alt="Basketball player driving to the basket"
                fill
                sizes="370px"
                className="object-cover object-[50%_42%]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/28 to-black/8" />
              <div className="absolute left-4 top-4 rounded-full bg-white/14 px-3 py-1 text-[10px] text-white backdrop-blur">
                Due Today
              </div>
              <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-ht-orange px-3 py-1 text-[10px] text-white">
                <Flame className="size-3" />
                7 day streak
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-white/66">Coach Marcus assigned</p>
                    <h3 className="text-[25px] leading-none text-white">Finishing Focus</h3>
                  </div>
                  <div className="relative size-14 shrink-0 rounded-full bg-white/16 backdrop-blur">
                    <div className="absolute inset-1 rounded-full border-[5px] border-ht-orange" />
                    <div className="absolute inset-3 rounded-full bg-white" />
                    <span className="ht-num absolute inset-0 flex items-center justify-center text-[20px] text-ht-orange">64</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Drills', '6'],
                    ['Minutes', '18'],
                    ['Clips', '12'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white/12 px-2 py-1.5 backdrop-blur">
                      <p className="text-[8px] text-white/54">{label}</p>
                      <p className="ht-num text-[19px] leading-none text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-ht-orange/25 bg-ht-orange-soft p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-ht-orange" />
              <div>
                <p className="text-[12px] text-ht-ink">Coach note</p>
                <p className="mt-0.5 text-[10px] leading-4 text-ht-muted">
                  Attack left, finish through contact, then upload the best five reps.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ['Handle', '88', 'text-ht-ink'],
              ['Finish', '91', 'text-ht-orange'],
              ['Footwork', '76', 'text-ht-orange'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-lg border border-ht-line-soft bg-white px-2 py-2 text-center shadow-[0_8px_22px_rgba(10,10,10,0.035)]">
                <p className="text-[9px] text-ht-muted">{label}</p>
                <p className={`ht-num text-[24px] leading-none ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-ht-line bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-ht-ink">Today&apos;s drill queue</p>
              <span className="rounded-full bg-ht-orange-soft px-2 py-1 text-[9px] text-ht-orange">On pace</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {([
                ['1', 'Warm-up handles', 'Done', true],
                ['2', 'Wing pull-up', 'Record', false],
                ['3', 'Contact finish', 'Next', false],
              ] as Array<[string, string, string, boolean]>).map(([step, title, status, complete]) => (
                <div key={title} className="flex items-center gap-2 rounded-lg bg-ht-chip px-2 py-1.5">
                  <span className={`inline-flex size-5 items-center justify-center rounded-full text-[9px] ${complete ? 'bg-ht-orange text-white' : 'bg-white text-ht-ink'}`}>
                    {complete ? <Check className="size-3" /> : step}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ht-ink">{title}</span>
                  <span className={complete ? 'text-[9px] text-ht-muted' : 'text-[9px] text-ht-orange'}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_44px] gap-2">
            <span className="landing-button-shine rounded-lg bg-ht-orange py-2.5 text-center text-[14px] text-white shadow-[0_12px_28px_rgba(254,72,0,0.22)]">
              Continue Workout
            </span>
            <span className="inline-flex items-center justify-center rounded-lg border border-ht-line bg-white text-ht-ink">
              <Video className="size-5" />
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl border border-ht-line p-2">
            <div className="relative size-11 overflow-hidden rounded-lg bg-ht-ink">
              <Image
                src="/landing/wing-jumper.png"
                alt="Basketball player shooting a wing jumper"
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] text-ht-ink">Catch & Shoot</p>
              <p className="truncate text-[11px] text-ht-muted">Next up - 4 drills - 12 min</p>
            </div>
            <ArrowRight className="ml-auto size-4 text-ht-ink" />
          </div>
        </div>
        <PhoneNav active="Workouts" />
      </div>
    </div>
  )
}

function PhoneNav({ active }: { active: string }) {
  const items = [
    [Camera, 'Capture'],
    [Dumbbell, 'Workouts'],
    [Users, 'Requests'],
    [ClipboardList, 'Plan'],
    [BarChart3, 'Progress'],
    [UserRound, 'Me'],
  ] as Array<[LucideIcon, string]>

  return (
    <div className="grid grid-cols-6 border-t border-ht-line bg-white px-1 py-2">
      {items.map(([Icon, label]) => (
        <div key={label} className="text-center">
          <Icon className={`mx-auto size-4 ${active === label ? 'text-ht-orange' : 'text-ht-ink'}`} strokeWidth={1.8} />
          <p className={`mt-1 text-[8px] ${active === label ? 'text-ht-orange' : 'text-ht-ink'}`}>{label}</p>
        </div>
      ))}
    </div>
  )
}

function ProofVisual({ index }: { index: number }) {
  if (index === 2) {
    return (
      <div className="relative mx-5 h-[220px] overflow-hidden rounded-lg border border-ht-line bg-white md:mx-3 md:h-[132px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(254,72,0,0.16),transparent_34%),linear-gradient(135deg,#fff,#f7f7f7)]" />
        <div className="relative grid h-full grid-cols-[0.42fr_0.58fr]">
          <div className="border-r border-ht-line-soft p-4 md:p-3">
            <p className="text-[13px] text-ht-muted md:text-[9px]">Overall Grade</p>
            <p className="ht-num text-[58px] leading-none text-ht-orange md:text-[35px]">B+</p>
            <p className="mt-4 text-[13px] text-ht-muted md:mt-2 md:text-[9px]">Current Streak</p>
            <div className="flex items-end gap-1">
              <span className="ht-num text-[48px] leading-none text-ht-orange md:text-[30px]">7</span>
              <span className="pb-2 text-[13px] text-ht-muted md:pb-1 md:text-[9px]">days</span>
            </div>
          </div>
          <div className="p-4 md:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-ht-muted md:text-[9px]">Training Volume</p>
              <span className="text-[13px] text-ht-orange md:text-[9px]">+22%</span>
            </div>
            <div className="mt-6 flex h-[104px] items-end gap-2 md:mt-3 md:h-16 md:gap-1.5">
              {[24, 42, 36, 51, 46, 61].map((height, barIndex) => (
                <span key={barIndex} className="flex-1 rounded-t bg-ht-orange" style={{ height }} />
              ))}
            </div>
            <div className="mt-3 rounded-md bg-ht-orange-soft px-3 py-2 text-[13px] text-ht-orange md:mt-2 md:px-2 md:py-1 md:text-[9px]">
              Best week this month
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-5 h-[220px] overflow-hidden rounded-lg bg-ht-ink md:mx-3 md:h-[132px]">
      <Image
        src={index === 0 ? '/landing/finishing-drive.png' : '/landing/dribble-training.png'}
        alt={index === 0 ? 'Assigned workout preview' : 'Recording preview'}
        fill
        sizes="190px"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/12 to-white/8" />
      {index === 0 ? <PlanOverlay /> : <CaptureOverlay />}
    </div>
  )
}

function PlanOverlay() {
  return (
    <div className="absolute inset-x-6 bottom-6 rounded-xl border border-white/16 bg-white/92 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur md:inset-x-3 md:bottom-3 md:rounded-lg md:p-2">
      <div className="flex items-center justify-between">
        <span>
          <span className="block text-[14px] text-ht-muted md:text-[9px]">Next drill</span>
          <span className="block whitespace-nowrap text-[21px] leading-none text-ht-ink md:text-[13px]">Finishing Focus</span>
        </span>
        <span className="rounded-full bg-ht-orange-soft px-3 py-2 text-[14px] text-ht-orange md:px-2 md:py-1 md:text-[9px]">18 min</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px] md:mt-2 md:gap-1.5 md:text-[8px]">
        <span className="rounded bg-ht-chip py-1 text-ht-ink">6 drills</span>
        <span className="rounded bg-ht-chip py-1 text-ht-ink">25 reps</span>
        <span className="rounded bg-ht-orange-soft py-1 text-ht-orange">On pace</span>
      </div>
    </div>
  )
}

function CaptureOverlay() {
  return (
    <>
      <span className="absolute right-6 top-6 rounded bg-ht-orange px-4 py-2 text-[14px] text-white md:right-3 md:top-3 md:px-2 md:py-1 md:text-[9px]">REC - 00:12</span>
      <div className="absolute inset-x-12 top-16 h-20 rounded border border-white/65 md:inset-x-8 md:top-8 md:h-14" />
      <div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ht-orange/75 md:size-14" />
      <div className="absolute bottom-6 left-6 rounded-lg bg-black/70 px-4 py-2 text-[14px] text-white md:bottom-3 md:left-3 md:px-2 md:py-1 md:text-[9px]">Rep 12 / 25</div>
      <div className="absolute bottom-6 right-6 rounded-lg bg-white/92 px-4 py-2 text-[14px] text-ht-ink md:bottom-3 md:right-3 md:px-2 md:py-1 md:text-[9px]">1080p</div>
    </>
  )
}

function TrainingPlanPanel() {
  return (
    <SidePanel title="Training Plan">
      {[
        ['Mon', 'Aug 25', 'Ball Handling', true],
        ['Tue', 'Aug 26', 'Finishing Focus', false],
        ['Thu', 'Aug 28', 'Spot-Up Shooting', false],
      ].map(([day, date, title, done]) => (
        <div key={title as string} className={`flex items-center gap-3 rounded-lg border p-2.5 ${(title as string) === 'Finishing Focus' ? 'border-ht-orange bg-ht-orange-soft' : 'border-ht-line'}`}>
          <span className="w-12 shrink-0 text-center">
            <span className="ht-heading block text-[11px] text-ht-ink">{day as string}</span>
            <span className="block text-[10px] text-ht-muted">{date as string}</span>
          </span>
          {done ? <CheckCircle2 className="size-5 text-ht-orange" /> : <span className="size-5 rounded-full border border-ht-muted" />}
          <span className={(title as string) === 'Finishing Focus' ? 'text-[14px] text-ht-orange' : 'text-[14px] text-ht-ink'}>{title as string}</span>
          <ArrowRight className="ml-auto size-4 text-ht-ink" />
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 text-[13px] text-ht-orange">
        <span>View Full Plan</span>
        <ArrowRight className="size-4" />
      </div>
    </SidePanel>
  )
}

function ProgressSnapshotPanel() {
  return (
    <SidePanel title="Progress Snapshot">
      <div className="grid grid-cols-3 divide-x divide-ht-line-soft rounded-lg border border-ht-line">
        {[
          ['Clips Recorded', '28', '18%'],
          ['Workouts Completed', '12', '20%'],
          ['Minutes Trained', '740', '22%'],
        ].map(([label, value, change]) => (
          <div key={label} className="p-2.5 text-center">
            <p className="ht-heading text-[9px] text-ht-muted">{label}</p>
            <p className="ht-num mt-1 text-[30px] text-ht-ink">{value}</p>
            <TrendLine />
            <p className="mt-1 text-[9px] text-ht-orange">+ {change}</p>
          </div>
        ))}
      </div>
    </SidePanel>
  )
}

function ProgressReportPanel() {
  return (
    <SidePanel title="Progress Report">
      <div className="grid grid-cols-[0.42fr_0.58fr] gap-3">
        <div className="rounded-lg border border-ht-line p-2.5">
          <p className="text-[10px] text-ht-muted">Overall Grade</p>
          <p className="ht-num text-[32px] text-ht-orange">B+</p>
          <p className="mt-2 text-[10px] text-ht-muted">Current Streak</p>
          <p className="ht-num text-[26px] text-ht-orange">7 days</p>
          <p className="mt-2 text-[10px] text-ht-muted">Hours Trained</p>
          <p className="ht-num text-[26px] text-ht-ink">12.4</p>
        </div>
        <BarChartMini />
      </div>
    </SidePanel>
  )
}

function MoveLibraryPanel() {
  return (
    <SidePanel title="Move Library">
      <div className="flex flex-wrap gap-2">
        {['All', 'Finishing', 'Shooting', 'Ball Handling'].map((chip, index) => (
          <span key={chip} className={`rounded-md border px-3 py-1 text-[12px] ${index === 0 ? 'border-ht-orange bg-ht-orange text-white' : 'border-ht-line text-ht-muted'}`}>
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ['/landing/dribble-training.png', 'Dribble breakdown clip'],
          ['/landing/wing-jumper.png', 'Wing jumper clip'],
          ['/landing/finishing-drive.png', 'Finishing drive clip'],
        ].map(([src, alt]) => (
          <div key={src} className="relative h-14 overflow-hidden rounded-lg bg-ht-ink">
            <Image src={src} alt={alt} fill sizes="120px" className="object-cover" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <span className="rounded-lg border border-ht-orange px-3 py-2 text-center text-[12px] text-ht-orange">Study Clip</span>
        <span className="rounded-lg bg-ht-orange px-3 py-2 text-center text-[12px] text-white">Upload Your Rep</span>
      </div>
    </SidePanel>
  )
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ht-line bg-white p-3.5 shadow-[0_12px_45px_rgba(10,10,10,0.04)]">
      <h3 className="ht-heading text-[21px] text-ht-ink">{title}</h3>
      <div className="mt-2.5 space-y-2">{children}</div>
    </div>
  )
}

function TrendLine() {
  return (
    <div className="mx-auto mt-1.5 flex h-7 w-20 items-end gap-1">
      {[8, 14, 12, 19, 17, 22, 27].map((height, index) => (
        <span key={index} className="w-1 rounded bg-ht-orange" style={{ height }} />
      ))}
    </div>
  )
}

function BarChartMini() {
  return (
    <div className="rounded-lg border border-ht-line p-2.5">
      <p className="text-[11px] text-ht-muted">Training Volume</p>
      <div className="mt-3 flex h-[92px] items-end gap-3">
        {[46, 62, 56, 42, 58, 70].map((height, index) => (
          <span key={index} className="flex-1 rounded-t bg-ht-orange" style={{ height }} />
        ))}
      </div>
    </div>
  )
}
