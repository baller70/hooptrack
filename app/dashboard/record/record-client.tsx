'use client'

import dynamic from 'next/dynamic'

const VideoRecorder = dynamic(() => import('@/components/video-recorder'), { ssr: false })

interface Drill {
  id: number
  name: string
  duration_seconds: number
  timer_mode: 'timed' | 'stopwatch' | 'reps'
  target_reps: number | null
}

interface PRData {
  previous_seconds: number | null
  best_seconds: number | null
  previous_reps: number | null
  best_reps: number | null
}

export default function RecordClient({ drill, pr }: { drill: Drill; pr: PRData }) {
  return <VideoRecorder drill={drill} pr={pr} />
}
