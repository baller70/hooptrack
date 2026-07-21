import PublicDocumentPage from '@/components/public-document-page'

export default function TermsPage() {
  return (
    <PublicDocumentPage title="Terms Of Use" updated="July 18, 2026">
      <section>
        <h2>Using HoopTrack</h2>
        <p className="mt-2">You must be at least 13 to create a HoopTrack account. You may use HoopTrack for lawful basketball coaching, training, recording, and communication. Keep your credentials secure and provide accurate account and team information.</p>
      </section>
      <section>
        <h2>Player Safety</h2>
        <p className="mt-2">Training plans are informational and are not medical advice. Stop activity when injured or unwell and consult an appropriate professional before beginning or changing a training program.</p>
      </section>
      <section>
        <h2>User Content</h2>
        <p className="mt-2">You keep ownership of content you submit and grant HoopTrack permission to store, process, display, and transmit it only as needed to operate the service. You must have permission to upload and share the content. Harassment, threats, hate, sexual exploitation, illegal content, spam, and infringement are prohibited.</p>
      </section>
      <section>
        <h2>Enforcement</h2>
        <p className="mt-2">Users can report messages and block other users. We may review reports and restrict or close accounts that violate these terms or create safety, legal, or security risks.</p>
      </section>
      <section>
        <h2>Availability</h2>
        <p className="mt-2">We work to keep HoopTrack reliable but cannot promise uninterrupted operation. Features may change as the service and platform requirements evolve.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p className="mt-2">Questions about these terms can be sent to <a className="font-semibold text-hoop-orange hover:underline" href="mailto:khouston@thebasketballfactorynj.com">khouston@thebasketballfactorynj.com</a>.</p>
      </section>
    </PublicDocumentPage>
  )
}
