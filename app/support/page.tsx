import PublicDocumentPage from '@/components/public-document-page'

export default function SupportPage() {
  return (
    <PublicDocumentPage title="HoopTrack Support">
      <section>
        <h2>Get Help</h2>
        <p className="mt-2">For account access, team invitations, recordings, privacy, safety reports, or account deletion, email our support team. Include whether you use HoopTrack Player or HoopTrack Coach and the email address connected to the account.</p>
        <a
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border-2 border-black bg-hoop-orange px-4 font-bold text-white shadow-[2px_2px_0px_0px_#0A0A0A] hover:opacity-90"
          href="mailto:khouston@thebasketballfactorynj.com?subject=HoopTrack%20Support"
        >
          Email HoopTrack Support
        </a>
      </section>
      <section>
        <h2>Safety</h2>
        <p className="mt-2">Use the flag beside an incoming chat message to report it. Use the block control to immediately stop that person from messaging you. For urgent physical danger, contact local emergency services.</p>
      </section>
      <section>
        <h2>Account Deletion</h2>
        <p className="mt-2">Player accounts can be deleted in Profile by selecting Delete Account and confirming the request. Coach organization account closures can be requested by email.</p>
      </section>
    </PublicDocumentPage>
  )
}
