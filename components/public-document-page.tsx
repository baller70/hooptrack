import Link from 'next/link'

export default function PublicDocumentPage({
  title,
  updated,
  children,
}: {
  title: string
  updated?: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-hoop-black">
      <article className="mx-auto max-w-3xl rounded-lg border-2 border-black bg-white shadow-[4px_4px_0px_0px_#0A0A0A]">
        <header className="border-b-2 border-black p-5 sm:p-7">
          <Link href="/" className="text-sm font-semibold text-hoop-orange hover:underline">HoopTrack</Link>
          <h1 className="mt-2 font-[family-name:var(--font-russo)] text-4xl leading-none">{title}</h1>
          {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>}
        </header>
        <div className="space-y-6 p-5 text-sm leading-7 sm:p-7 [&_h2]:font-[family-name:var(--font-russo)] [&_h2]:text-xl [&_h2]:leading-none [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
        <footer className="flex flex-wrap gap-4 border-t-2 border-black p-5 text-sm font-semibold">
          <Link href="/privacy" className="hover:text-hoop-orange">Privacy</Link>
          <Link href="/terms" className="hover:text-hoop-orange">Terms</Link>
          <Link href="/support" className="hover:text-hoop-orange">Support</Link>
        </footer>
      </article>
    </main>
  )
}
