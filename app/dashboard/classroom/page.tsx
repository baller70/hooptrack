'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpenCheck, GraduationCap, Plus, Trophy, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import AIQuizGenerator from '@/components/ai-quiz-generator'
import InlineRename from '@/components/inline-rename'
import { toast } from 'sonner'
import {
  EmptyWorkspaceState,
  StatTile,
  TrainingWorkspaceShell,
  WorkspaceActionLink,
  WorkspacePanel,
} from '@/components/training-workspace-shell'

interface Quiz {
  id: number
  title: string
  type: string
  question_count: number
  best_score: number | null
  attempt_count: number
  creator_name: string
}

export default function ClassroomPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    fetch('/api/quizzes').then(r => r.json()).then(d => setQuizzes(d.quizzes || []))
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setUserRole(d.user.role)
    }).catch(() => {})
  }, [])

  async function renameQuiz(id: number, newTitle: string) {
    const res = await fetch(`/api/quizzes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    if (res.ok) {
      setQuizzes(quizzes.map((q) => (q.id === id ? { ...q, title: newTitle } : q)))
      toast.success('Quiz renamed')
    } else {
      toast.error('Rename failed')
    }
  }

  const completedCount = quizzes.filter((quiz) => quiz.attempt_count > 0).length
  const questionCount = quizzes.reduce((sum, quiz) => sum + quiz.question_count, 0)
  const averageBestScore = quizzes.filter((quiz) => quiz.best_score !== null)
  const bestScoreLabel = averageBestScore.length
    ? `${Math.round(averageBestScore.reduce((sum, quiz) => sum + (quiz.best_score || 0), 0) / averageBestScore.length)}%`
    : '-'

  return (
    <TrainingWorkspaceShell
      active="classroom"
      app={userRole === 'trainer' ? 'coach' : 'player'}
      title="Classroom"
      description="Check whether players understand the reads, details, and decisions behind the work."
      primary={userRole === 'trainer' && (
        <>
          <AIQuizGenerator />
          <Link
            href="/dashboard/classroom/create"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-black bg-hoop-orange px-4 text-sm font-bold text-white shadow-[2px_2px_0px_0px_#0A0A0A] hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Manual quiz
          </Link>
        </>
      )}
      stats={
        <>
          <StatTile label="Quizzes" value={quizzes.length} />
          <StatTile label="Questions" value={questionCount} />
          <StatTile label="Attempted" value={completedCount} />
          <StatTile label="Best avg." value={bestScoreLabel} />
        </>
      }
      sidebar={
        <>
          <WorkspaceActionLink
            href="/dashboard/moves"
            icon={Video}
            title="Teach from a move"
            body="Use the move library as the source material for a quiz or video check."
          />
          <WorkspaceActionLink
            href="/dashboard/workouts"
            icon={BookOpenCheck}
            title="Connect to training"
            body="Pair classroom checks with the workout that proves the player understands it."
          />
        </>
      }
    >
      <WorkspacePanel
        title="Learning checks"
        description="Each quiz opens into a focused player-facing assessment."
      >
        {quizzes.length === 0 ? (
          <EmptyWorkspaceState
            icon={GraduationCap}
            title="No quizzes yet"
            body={userRole === 'trainer' ? 'Create a short check from a move, scout note, or workout detail.' : 'Your coach has not assigned classroom work yet.'}
            action={userRole === 'trainer' && (
              <Link
                href="/dashboard/classroom/create"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-hoop-black px-4 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Create quiz
              </Link>
            )}
          />
        ) : (
          <div className="divide-y-2 divide-gray-100 rounded-lg border-2 border-black bg-white">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="p-4 transition-colors hover:bg-orange-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/classroom/${quiz.id}`} className="min-w-0 hover:underline">
                        <h4 className="truncate font-semibold text-lg leading-tight">{quiz.title}</h4>
                      </Link>
                      {userRole === 'trainer' && (
                        <InlineRename value={quiz.title} onSave={(v) => renameQuiz(quiz.id, v)} variant="h4" iconOnly />
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{quiz.question_count} questions</Badge>
                      <Badge variant="outline" className="capitalize">{quiz.type.replace('_', ' ')}</Badge>
                      {quiz.attempt_count > 0 && (
                        <Badge variant="outline">{quiz.attempt_count} attempts</Badge>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/classroom/${quiz.id}`} className="shrink-0 text-right">
                    {quiz.best_score !== null ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">{quiz.best_score}%</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold uppercase text-muted-foreground">Start</span>
                    )}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </WorkspacePanel>
    </TrainingWorkspaceShell>
  )
}
