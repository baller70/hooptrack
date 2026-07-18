import Link from 'next/link'
import { Dumbbell, Video, CalendarDays, GraduationCap } from 'lucide-react'
import { redirect } from 'next/navigation'
import { appHomeForRole } from '@/lib/app-routes'
import { getSession } from '@/lib/session'

export default async function HomePage() {
  const session = await getSession()
  if (session) redirect(appHomeForRole(session.role))

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="font-[family-name:var(--font-russo)] text-5xl mb-2">HoopTrack</h1>
        <p className="text-lg text-muted-foreground">Player app and coach app for connected basketball training</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm w-full">
        <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#0A0A0A] text-center">
          <Video className="h-8 w-8 mx-auto mb-2 text-hoop-orange" />
          <p className="text-sm font-medium">Record Drills</p>
        </div>
        <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#0A0A0A] text-center">
          <Dumbbell className="h-8 w-8 mx-auto mb-2 text-hoop-orange" />
          <p className="text-sm font-medium">Track Workouts</p>
        </div>
        <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#0A0A0A] text-center">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 text-hoop-orange" />
          <p className="text-sm font-medium">Stay Accountable</p>
        </div>
        <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#0A0A0A] text-center">
          <GraduationCap className="h-8 w-8 mx-auto mb-2 text-hoop-orange" />
          <p className="text-sm font-medium">Learn & Quiz</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/player"
          className="bg-hoop-black text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Player App
        </Link>
        <Link
          href="/coach"
          className="bg-hoop-orange text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Coach App
        </Link>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        New player?{' '}
        <Link href="/register" className="font-semibold text-hoop-orange hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
