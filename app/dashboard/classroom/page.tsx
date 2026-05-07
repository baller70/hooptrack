'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, GraduationCap, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import AIQuizGenerator from '@/components/ai-quiz-generator'
import InlineRename from '@/components/inline-rename'
import LibraryTabs from '@/components/library-tabs'
import { toast } from 'sonner'

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

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <LibraryTabs />
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[family-name:var(--font-russo)] text-2xl">Classroom</h2>
        {userRole === 'trainer' && (
          <div className="flex items-center gap-2">
            <AIQuizGenerator />
            <Link
              href="/dashboard/classroom/create"
              className="flex items-center gap-1 bg-hoop-orange text-white px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Manual
            </Link>
          </div>
        )}
      </div>

      {quizzes.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No quizzes yet.</p>
        </div>
      )}

      <div className="grid gap-3">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#0A0A0A] hover:shadow-[1px_1px_0px_0px_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/classroom/${quiz.id}`} className="hover:underline">
                    <h4 className="font-semibold text-lg">{quiz.title}</h4>
                  </Link>
                  {userRole === 'trainer' && (
                    <InlineRename value={quiz.title} onSave={(v) => renameQuiz(quiz.id, v)} variant="h4" iconOnly />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{quiz.question_count} questions</Badge>
                  <Badge variant="outline" className="capitalize">{quiz.type.replace('_', ' ')}</Badge>
                </div>
              </div>
              <Link href={`/dashboard/classroom/${quiz.id}`} className="text-right">
                {quiz.best_score !== null && (
                  <div className="flex items-center gap-1 text-sm">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold">{quiz.best_score}%</span>
                  </div>
                )}
                {quiz.attempt_count > 0 && (
                  <p className="text-xs text-muted-foreground">{quiz.attempt_count} attempts</p>
                )}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
