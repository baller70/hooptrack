import PublicDocumentPage from '@/components/public-document-page'

export default function PrivacyPage() {
  return (
    <PublicDocumentPage title="Privacy Policy" updated="July 18, 2026">
      <section>
        <h2>Information We Collect</h2>
        <p className="mt-2">HoopTrack processes the information needed to operate Player and Coach accounts and provide basketball training services.</p>
        <ul className="mt-2">
          <li>Account details such as name, email address, role, and a securely hashed password.</li>
          <li>Training records such as workouts, schedules, quiz results, progress, groups, and team invitations.</li>
          <li>User content such as messages, photos, videos, audio, files, and recording notes that you choose to upload.</li>
          <li>Device and technical information needed for sign-in security, push notifications, diagnostics, and reliable delivery.</li>
        </ul>
      </section>
      <section>
        <h2>How Information Is Used</h2>
        <p className="mt-2">We use this information to authenticate accounts, connect players and coaches, deliver training features, store and play recordings, provide notifications, prevent abuse, respond to reports, support users, and improve reliability.</p>
      </section>
      <section>
        <h2>Sharing And Sale</h2>
        <p className="mt-2">HoopTrack does not sell personal information or use it for third-party advertising. Information is shared only with the coaches or players you interact with, service providers that host or operate HoopTrack, or when required by law or needed to protect users and the service.</p>
      </section>
      <section>
        <h2>Retention And Deletion</h2>
        <p className="mt-2">Information is kept while an account is active and as reasonably needed for security, legal, backup, and support obligations. Players can permanently delete their account and associated content from Profile. Coach organization accounts can request closure through Support.</p>
      </section>
      <section>
        <h2>Children And Teams</h2>
        <p className="mt-2">HoopTrack does not currently permit account registration by children under 13. A player must confirm they are at least 13 when registering. Coaches must not create or invite an account for a child under 13. Contact Support to review or remove a child&apos;s information that may have been provided contrary to this rule.</p>
      </section>
      <section>
        <h2>Your Choices</h2>
        <p className="mt-2">You can control uploads, decline team invitations, block or report another user, disable device notifications, or delete your Player account. Privacy questions and access or deletion requests can be sent to <a className="font-semibold text-hoop-orange hover:underline" href="mailto:khouston@thebasketballfactorynj.com">khouston@thebasketballfactorynj.com</a>.</p>
      </section>
    </PublicDocumentPage>
  )
}
