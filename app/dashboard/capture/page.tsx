import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays, ScanSearch, Upload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getSession } from '@/lib/session'
import RecordSetup from '@/components/record-setup'
import {
  StatTile,
  TrainingWorkspaceShell,
  WorkspaceActionLink,
  WorkspacePanel,
} from '@/components/training-workspace-shell'

export default async function CapturePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <TrainingWorkspaceShell
      active="capture"
      title="Capture"
      description="Start with clean footage. Record on your phone, upload a move, then send the clip into analysis, workouts, or the calendar."
      primary={
        <>
          <HeaderButton href="/dashboard/moves/upload" icon={Upload} label="Upload" />
          <HeaderButton href="/film/index.html" icon={ScanSearch} label="Analyze" />
        </>
      }
      stats={
        <>
          <StatTile label="Fast start" value="Free play" />
          <StatTile label="Best device" value="Phone" />
          <StatTile label="Next step" value="Review" />
          <StatTile label="Plan link" value="Calendar" />
        </>
      }
      sidebar={
        <>
          <WorkspaceActionLink
            href="/dashboard/moves/upload"
            icon={Upload}
            title="Upload and categorize"
            body="Add a custom move video, set its category, and make it easy to find later."
          />
          <WorkspaceActionLink
            href="/film/index.html"
            icon={ScanSearch}
            title="Open Film & Video"
            body="Slow down a clip, compare movement, and mark the details that need coaching."
          />
          <WorkspaceActionLink
            href="/calendar/index.html"
            icon={CalendarDays}
            title="Put it on the plan"
            body="Turn the next rep, workout, or review into something the player can follow."
          />
        </>
      }
    >
      <WorkspacePanel
        title="Record now"
        description="Use Free Play for a quick phone capture, or attach the recording to a drill when it belongs to a workout."
      >
        <RecordSetup />
      </WorkspacePanel>
    </TrainingWorkspaceShell>
  )
}

function HeaderButton({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-black bg-white px-4 text-sm font-bold shadow-[2px_2px_0px_0px_#0A0A0A] hover:bg-orange-50"
    >
      <Icon className="h-4 w-4 text-hoop-orange" />
      {label}
    </Link>
  )
}
