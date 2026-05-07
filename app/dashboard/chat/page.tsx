import { redirect } from 'next/navigation'

// Old standalone chat tab — replaced by inline EntityChat on each entity.
// This redirect keeps any stale bookmarks / notifications working.
export default function ChatRedirectPage() {
  redirect('/dashboard/notifications')
}
