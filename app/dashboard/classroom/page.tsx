'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Award,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Plus,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import AIQuizGenerator from '@/components/ai-quiz-generator'
import InlineRename from '@/components/inline-rename'
import { appPath, type HoopApp } from '@/lib/app-routes'
import { cn } from '@/lib/utils'
import {
  Card,
  EmptyState,
  PageTitle,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'
import { TrainingWorkspaceTabs } from '@/components/training-workspace-tabs'

/* Implements design/hooptrack-raw-individual-screens/ios/
 * 010-player-classroom-raw.png */

/** A best score at or above this counts as mastered on the results tile. */
const MASTERY_SCORE = 90

interface Quiz {
  id: number
  title: string
  type: string
  question_count: number
  best_score: number | null
  attempt_count: number
  creator_name: string
}

interface Question {
  id: number
  question_text: string
  options: string[]
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function typeLabel(type: string) {
  return type.replace(/_/g, ' ')
}

/* ------------------------------------------------------------------ shell */

export default function ClassroomPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [userRole, setUserRole] = useState('')
  const [tab, setTab] = useState<'quizzes' | 'results'>('quizzes')
  const [preview, setPreview] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/quizzes').then(r => r.json()).then(d => setQuizzes(d.quizzes || []))
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setUserRole(d.user.role)
    }).catch(() => {})
  }, [])

  const featured = quizzes[0] ?? null
  const featuredId = featured?.id ?? null

  // The list endpoint carries no questions, so the preview pulls the first
  // question of the featured quiz from its detail route.
  useEffect(() => {
    if (featuredId == null) return
    let cancelled = false
    setPicked(null)
    fetch(`/api/quizzes/${featuredId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled) setPreview(d?.questions?.[0] ?? null)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [featuredId])

  const renameQuiz = useCallback(async (id: number, newTitle: string) => {
    const res = await fetch(`/api/quizzes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    if (res.ok) {
      setQuizzes(current => current.map(q => (q.id === id ? { ...q, title: newTitle } : q)))
      toast.success('Quiz renamed')
    } else {
      toast.error('Rename failed')
    }
  }, [])

  const isTrainer = userRole === 'trainer'
  const app: HoopApp = isTrainer ? 'coach' : 'player'

  const results = useMemo(() => {
    const attempted = quizzes.filter(q => q.attempt_count > 0)
    const scored = attempted.filter(q => q.best_score !== null)
    return {
      attempted,
      average: scored.length
        ? Math.round(scored.reduce((sum, q) => sum + (q.best_score ?? 0), 0) / scored.length)
        : null,
      taken: attempted.length,
      mastered: scored.filter(q => (q.best_score ?? 0) >= MASTERY_SCORE).length,
    }
  }, [quizzes])

  return (
    <div className="pt-2 sm:pt-6">
      <PageTitle>Classroom</PageTitle>
      {/* The phone design goes straight from the title to the Quizzes/Results
          toggle; the strip belongs to the desktop workspace layout. */}
      <TrainingWorkspaceTabs active="classroom" app={app} className="mt-3 hidden lg:flex" />

      {isTrainer ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <AIQuizGenerator />
          <Link
            href={appPath(app, '/classroom/create')}
            className="ht-heading inline-flex items-center justify-center gap-2 rounded-lg border border-ht-orange bg-white px-4 py-2.5 text-[14px] tracking-[0.02em] text-ht-orange transition-colors hover:bg-ht-orange-soft"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Manual Quiz
          </Link>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 lg:max-w-md">
        <TabButton active={tab === 'quizzes'} onClick={() => setTab('quizzes')}>
          Quizzes
        </TabButton>
        <TabButton active={tab === 'results'} onClick={() => setTab('results')}>
          Results
        </TabButton>
      </div>

      {quizzes.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon={GraduationCap}
            title="No quizzes yet"
            body={
              isTrainer
                ? 'Create a short check from a move, scout note, or workout detail.'
                : 'Your coach has not assigned classroom work yet.'
            }
            action={
              isTrainer ? (
                <PrimaryButton href={appPath(app, '/classroom/create')}>
                  <Plus className="size-[18px]" strokeWidth={2.5} />
                  Create Quiz
                </PrimaryButton>
              ) : undefined
            }
          />
        </Card>
      ) : tab === 'quizzes' ? (
        /* Phones follow the design's order — quiz card, then results, then the
           rest of the library. Desktop keeps results in a second column. */
        <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
          {featured ? (
            <div className="lg:col-start-1 lg:row-start-1">
              <FeaturedQuiz
                quiz={featured}
                question={preview}
                picked={picked}
                onPick={setPicked}
                href={appPath(app, `/classroom/${featured.id}`)}
              />
            </div>
          ) : null}

          <div className="lg:col-start-2 lg:row-start-1">
            <QuizResults
              average={results.average}
              taken={results.taken}
              mastered={results.mastered}
              onReview={() => setTab('results')}
            />
          </div>

          {quizzes.length > 1 ? (
            <div className="lg:col-start-1 lg:row-start-2">
              <QuizList
                quizzes={quizzes.slice(1)}
                app={app}
                isTrainer={isTrainer}
                onRename={renameQuiz}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <ResultsTab quizzes={quizzes} app={app} attempted={results.attempted.length} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ sub-sections */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // The two halves abut into one pill, as in the design.
        'rounded-full border px-4 py-2 text-[15px] transition-colors',
        active
          ? 'border-ht-orange bg-ht-orange text-white'
          : 'border-ht-line bg-ht-surface text-ht-ink hover:bg-ht-chip',
      )}
    >
      {children}
    </button>
  )
}

function FeaturedQuiz({
  quiz,
  question,
  picked,
  onPick,
  href,
}: {
  quiz: Quiz
  question: Question | null
  picked: number | null
  onPick: (index: number) => void
  href: string
}) {
  return (
    <Card padded={false}>
      <div className="flex items-center gap-3.5 p-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ht-orange-tint">
          <ClipboardList className="size-7 text-ht-orange" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <h2 className="ht-heading text-[20px] leading-tight text-ht-ink">{quiz.title}</h2>
          {/* The design reads "3 of 8 • Due May 14"; quizzes carry no due date,
              so attempts stand in for the second half. */}
          <p className="mt-1 text-[13px] text-ht-muted">
            {question ? `1 of ${quiz.question_count}` : `${quiz.question_count} questions`}
            <span className="px-1.5">•</span>
            {quiz.attempt_count > 0
              ? `${quiz.attempt_count} attempt${quiz.attempt_count === 1 ? '' : 's'}`
              : 'Not started'}
          </p>
        </div>
      </div>

      {question ? (
        <div className="border-t border-ht-line-soft px-5 pt-4">
          <p className="text-[17px] leading-[1.4] text-ht-ink">{question.question_text}</p>
          <div className="mt-4 space-y-2.5">
            {question.options.map((option, index) => {
              const selected = picked === index
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onPick(index)}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    selected
                      ? 'border-ht-orange bg-ht-surface'
                      : 'border-ht-line bg-ht-surface hover:bg-ht-chip/60',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border text-[14px] font-semibold',
                      selected
                        ? 'border-ht-orange bg-ht-orange text-white'
                        : 'border-ht-line text-ht-ink',
                    )}
                  >
                    {OPTION_LETTERS[index] ?? index + 1}
                  </span>
                  <span className="min-w-0 text-[15px] text-ht-ink">{option}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="p-5">
        <PrimaryButton href={href}>Take Quiz</PrimaryButton>
      </div>
    </Card>
  )
}

function QuizList({
  quizzes,
  app,
  isTrainer,
  onRename,
}: {
  quizzes: Quiz[]
  app: HoopApp
  isTrainer: boolean
  onRename: (id: number, title: string) => void
}) {
  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <SectionTitle>More Quizzes</SectionTitle>
      </div>
      <div className="mt-3">
        {quizzes.map((quiz, index) => (
          <div
            key={quiz.id}
            className={cn(
              'flex items-center gap-3 px-5 py-4',
              index > 0 && 'border-t border-ht-line-soft',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ht-orange-tint">
              <ClipboardList className="size-5 text-ht-orange" strokeWidth={1.7} />
            </span>
            <Link href={appPath(app, `/classroom/${quiz.id}`)} className="min-w-0 flex-1">
              {/* 010 measures the quiz title at an 18.96css cap — 26px in this
                  face — over a 12.64css meta line (16px). Ours sat at 15/13,
                  which read as a list row rather than the pack's card heading.
                  24px, not 26: the coach route carries longer seeded titles and
                  "Spacing And Reads" clipped at 26. */}
              <span className="ht-heading block truncate text-[24px] text-ht-ink">{quiz.title}</span>
              <span className="mt-0.5 block text-[16px] text-ht-muted capitalize">
                {quiz.question_count} question{quiz.question_count === 1 ? '' : 's'}
                <span className="px-1.5">•</span>
                {typeLabel(quiz.type)}
              </span>
            </Link>
            {isTrainer ? (
              <InlineRename
                value={quiz.title}
                onSave={(v) => onRename(quiz.id, v)}
                variant="h4"
                iconOnly
              />
            ) : null}
            {quiz.best_score !== null ? (
              <span className="ht-heading shrink-0 text-[15px] text-ht-orange">
                {quiz.best_score}%
              </span>
            ) : (
              <span className="ht-heading shrink-0 text-[13px] text-ht-muted">Start</span>
            )}
            <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
          </div>
        ))}
      </div>
    </Card>
  )
}

function QuizResults({
  average,
  taken,
  mastered,
  onReview,
}: {
  average: number | null
  taken: number
  mastered: number
  onReview: () => void
}) {
  const tiles = [
    { icon: Trophy, value: average === null ? '—' : `${average}%`, label: 'Average Score' },
    { icon: ClipboardCheck, value: taken, label: 'Quizzes Taken' },
    { icon: Award, value: mastered, label: 'Mastered' },
  ]

  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <SectionTitle>Quiz Results</SectionTitle>
      </div>

      <div className="mt-4 grid grid-cols-3 px-3">
        {tiles.map((tile, index) => {
          const Icon = tile.icon
          return (
            <div
              key={tile.label}
              className={cn(
                'px-2 text-center',
                index > 0 && 'border-l border-ht-line-soft',
              )}
            >
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-ht-orange-tint">
                <Icon className="size-6 text-ht-orange" strokeWidth={1.7} />
              </span>
              <div className="ht-heading mt-2 text-[26px] leading-none text-ht-ink">{tile.value}</div>
              <div className="mt-1.5 text-[12.5px] leading-4 text-ht-muted">{tile.label}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 border-t border-ht-line-soft">
        <button
          type="button"
          onClick={onReview}
          className="ht-heading flex w-full items-center justify-between px-5 py-4 text-[15px] tracking-[0.02em] text-ht-ink transition-colors hover:bg-ht-chip/60"
        >
          Review Results
          <ChevronRight className="size-5 text-ht-ink" strokeWidth={2} />
        </button>
      </div>
    </Card>
  )
}

function ResultsTab({
  quizzes,
  app,
  attempted,
}: {
  quizzes: Quiz[]
  app: HoopApp
  attempted: number
}) {
  if (attempted === 0) {
    return (
      <Card className="mt-4">
        <EmptyState
          icon={Trophy}
          title="No results yet"
          body="Scores show up here as soon as a quiz has been taken."
        />
      </Card>
    )
  }

  return (
    <Card padded={false} className="mt-4">
      <div className="px-5 pt-5">
        <SectionTitle>Every Attempt</SectionTitle>
      </div>
      <div className="mt-3">
        {quizzes.map((quiz, index) => (
          <Link
            key={quiz.id}
            href={appPath(app, `/classroom/${quiz.id}`)}
            className={cn(
              'flex items-center gap-3 px-5 py-4 transition-colors hover:bg-ht-chip/60',
              index > 0 && 'border-t border-ht-line-soft',
            )}
          >
            <div className="min-w-0 flex-1">
              <span className="ht-heading block truncate text-[15px] text-ht-ink">{quiz.title}</span>
              <span className="mt-0.5 block text-[13px] text-ht-muted">
                {quiz.attempt_count > 0
                  ? `${quiz.attempt_count} attempt${quiz.attempt_count === 1 ? '' : 's'}`
                  : 'Not started'}
                <span className="px-1.5">•</span>
                {quiz.question_count} questions
              </span>
            </div>
            <span
              className={cn(
                'ht-heading shrink-0 text-[17px]',
                quiz.best_score === null
                  ? 'text-ht-muted'
                  : quiz.best_score >= MASTERY_SCORE
                    ? 'text-ht-green'
                    : 'text-ht-orange',
              )}
            >
              {quiz.best_score === null ? '—' : `${quiz.best_score}%`}
            </span>
            <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
          </Link>
        ))}
      </div>
    </Card>
  )
}
