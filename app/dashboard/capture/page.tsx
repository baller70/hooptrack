import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import CaptureSetup from '@/components/capture-setup'
import { TrainingWorkspaceTabs } from '@/components/training-workspace-tabs'
import { appForRole } from '@/lib/app-routes'

/* Implements design/hooptrack-raw-individual-screens/ios/005-player-capture-setup-raw.png.
 * The workspace tab strip belongs to the desktop layout
 * (web-desktop/003-player-training-workspace-raw.png); the iOS screens reach
 * these sections through the bottom tab bar instead, so it stays desktop-only. */

export default async function CapturePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const app = appForRole(session.role)

  return (
    <div className="pt-2">
      <TrainingWorkspaceTabs active="capture" app={app} className="hidden lg:flex" />
      <CaptureSetup app={app} />
    </div>
  )
}
