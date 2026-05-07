'use client'

import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DeleteWorkoutButton({ workoutId }: { workoutId: number }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this workout and all its drills?')) return
    const res = await fetch(`/api/workouts/${workoutId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Workout deleted')
      router.push('/dashboard/workouts')
    } else {
      toast.error('Failed to delete')
    }
  }

  return (
    <button onClick={handleDelete} className="text-destructive hover:opacity-70 p-2">
      <Trash2 className="h-5 w-5" />
    </button>
  )
}
