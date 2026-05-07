'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import YouTubeEmbed from '@/components/youtube-embed'
import EntityChat from '@/components/entity-chat'
import InlineRename from '@/components/inline-rename'

interface Question {
  id: number
  question_text: string
  video_url: string | null
  options: string[]
  correct_answer: string
}

interface Quiz {
  id: number
  title: string
  type: string
}

interface AuthUser { id: number; role: string }

export default function QuizPlayerPage() {
  const params = useParams()
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [phase, setPhase] = useState<'loading' | 'intro' | 'question' | 'results'>('loading')
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null)
  const [me, setMe] = useState<AuthUser | null>(null)

  useEffect(() => {
    fetch(`/api/quizzes/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setQuiz(data.quiz)
        setQuestions(data.questions)
        setAnswers(new Array(data.questions.length).fill(''))
        setPhase('intro')
      })
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json()).then(d => { if (d?.user) setMe(d.user) }).catch(() => {})
  }, [params.id])

  async function renameQuiz(newTitle: string) {
    if (!quiz) return
    const res = await fetch(`/api/quizzes/${quiz.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    if (res.ok) {
      setQuiz({ ...quiz, title: newTitle })
      toast.success('Quiz renamed')
    } else {
      toast.error('Rename failed')
    }
  }

  function selectAnswer(answer: string) {
    const newAnswers = [...answers]
    newAnswers[currentIndex] = answer
    setAnswers(newAnswers)
  }

  function nextQuestion() {
    if (!answers[currentIndex]) {
      toast.error('Please select an answer')
      return
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      submitQuiz()
    }
  }

  async function submitQuiz() {
    const res = await fetch(`/api/quizzes/${params.id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    const data = await res.json()
    setResult(data)
    setPhase('results')
  }

  if (phase === 'loading') {
    return <div className="p-4 text-center">Loading...</div>
  }

  if (phase === 'intro' && quiz) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <Link href="/dashboard/classroom" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] overflow-hidden">
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="font-[family-name:var(--font-russo)] text-2xl">{quiz.title}</h2>
              {me?.role === 'trainer' && (
                <InlineRename value={quiz.title} onSave={renameQuiz} variant="h2" iconOnly />
              )}
            </div>
            <p className="text-muted-foreground mb-6">{questions.length} questions</p>
            <Button size="lg" onClick={() => setPhase('question')}>
              Start Quiz
            </Button>
          </div>
          <EntityChat contextType="quiz" contextId={quiz.id} contextTitle={quiz.title} embedded />
        </div>
      </div>
    )
  }

  if (phase === 'question') {
    const q = questions[currentIndex]
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-hoop-orange transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6">
          {q.video_url && (
            <div className="aspect-video rounded-lg overflow-hidden mb-4 border">
              <YouTubeEmbed url={q.video_url} />
            </div>
          )}

          <h3 className="text-lg font-semibold mb-4">{q.question_text}</h3>

          <div className="space-y-2">
            {q.options.map((option, i) => (
              <button
                key={i}
                onClick={() => selectAnswer(option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[currentIndex] === option
                    ? 'border-hoop-orange bg-orange-50 font-medium'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <Button onClick={nextQuestion} className="w-full mt-6">
            {currentIndex < questions.length - 1 ? 'Next' : 'Submit'}
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'results' && result) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] overflow-hidden">
          <div className="p-8 text-center">
            <div className="text-6xl font-[family-name:var(--font-russo)] mb-2">
              {result.score}%
            </div>
            <p className="text-lg text-muted-foreground mb-4">
              {result.correct} out of {result.total} correct
            </p>

            {result.score >= 80 ? (
              <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
                <CheckCircle className="h-6 w-6" />
                <span className="font-semibold">Great job!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-orange-600 mb-6">
                <XCircle className="h-6 w-6" />
                <span className="font-semibold">Keep practicing!</span>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => {
                setCurrentIndex(0)
                setAnswers(new Array(questions.length).fill(''))
                setResult(null)
                setPhase('question')
              }}>
                Retry
              </Button>
              <Button onClick={() => router.push('/dashboard/classroom')}>
                Back to Classroom
              </Button>
            </div>
          </div>
          {quiz && (
            <EntityChat contextType="quiz" contextId={quiz.id} contextTitle={quiz.title} defaultOpen embedded />
          )}
        </div>
      </div>
    )
  }

  return null
}
