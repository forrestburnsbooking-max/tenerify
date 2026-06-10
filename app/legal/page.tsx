export default function LegalPage() {
  const updated = "10 June 2026";

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-16">

        {/* Header */}
        <div>
          <a href="/" className="text-stone-500 hover:text-white text-sm transition-colors">← Tenerify.ai</a>
          <h1 className="text-3xl font-bold mt-4">
            Tenerify<span className="text-orange-400">.ai</span> — Legal
          </h1>
          <p className="text-stone-500 text-sm mt-2">Last updated: {updated}</p>
        </div>

        {/* Quick nav */}
        <nav className="flex flex-col gap-2 text-sm">
          {["Legal Notice", "Terms of Service", "Booking Conditions", "Cancellation & Refund Policy", "Privacy Policy", "Cookie Policy"].map((s) => (
            <a key={s} href={`#${s.toLowerCase().replace(/[^a-z]/g, "-")}`}
              className="text-orange-400 hover:text-orange-300 transition-colors">
              → {s}
            </a>
          ))}
        </nav>

        {/* Legal Notice */}
        <Section id="legal-notice" title="Legal Notice (Aviso Legal)">
          <P>In accordance with Article 10 of Spanish Law 34/2002 on Information Society Services and Electronic Commerce (LSSI-CE), the following information is provided about the entity responsible for this website.</P>

          <H3>Identification</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li><strong className="text-white">Trading name:</strong> Tenerify.ai</li>
            <li><strong className="text-white">Operating company:</strong> Spanish Dream Plus S.L.</li>
            <li><strong className="text-white">CIF:</strong> [PLACEHOLDER — to be confirmed]</li>
            <li><strong className="text-white">Registered address:</strong> Local 19, C.C. Playa Fañabé, Calle Londres 7, Costa Adeje, 38660, Tenerife, Spain</li>
            <li><strong className="text-white">Email:</strong> forrestburns.booking@gmail.com</li>
            <li><strong className="text-white">Phone / WhatsApp:</strong> +34 610 434 957</li>
          </ul>

          <H3>Purpose of the website</H3>
          <P>Tenerify.ai provides an AI-powered chat interface that helps visitors discover, select, and book tours and experiences in Tenerife, and to process the related payments via Stripe.</P>

          <H3>Intellectual property</H3>
          <P>The Tenerify.ai name, logo, design, and underlying software are the property of the operating company or its licensors. Tour descriptions, images, and videos may belong to the respective tour operators and are used with their permission.</P>

          <H3>Applicable law and jurisdiction</H3>
          <P>These terms are governed by Spanish law. Any disputes arising from the use of this website that cannot be resolved amicably will be submitted to the courts and tribunals of Santa Cruz de Tenerife, Spain, without prejudice to any mandatory consumer protection rules that grant you the right to bring proceedings in your own jurisdiction.</P>
        </Section>

        {/* Terms of Service */}
        <Section id="terms-of-service" title="Terms of Service">
          <P>Tenerify.ai is an AI-powered booking assistant for tours and experiences in Tenerife, Canary Islands, Spain. The service is operated by Spanish Dream Plus S.L., a company registered in Tenerife, Spain (see Legal Notice above).</P>
          <P>By using Tenerify.ai and making a payment through our platform, you agree to these Terms.</P>

          <H3>1. What we do</H3>
          <P>Tenerify.ai acts as a booking intermediary between customers and local tour operators in Tenerife. We facilitate the discovery, selection, and payment for experiences. The tours themselves are operated by our partner operators, primarily excursionstenerife.es.</P>
          <P>For some activities (e.g. buggy and quad tours), the experience you book (e.g. vehicle type, duration, route) is fulfilled by one of several licensed local partner operators, assigned based on availability for your chosen date and time. The assigned operator&apos;s name and contact details will be confirmed and provided to you before the activity.</P>

          <H3>2. Payments</H3>
          <P>All payments are processed securely by Stripe, Inc. Tenerify.ai receives payment on behalf of the tour operator and passes booking details to them. Your card data is handled exclusively by Stripe and never stored on our servers.</P>
          <P>For car and vehicle rentals (operated by Aliscar), only a deposit (typically 30% of the total rental price) is charged online at checkout. The remaining balance is paid directly to the rental operator in cash or card upon vehicle pickup. The full price and the deposit/balance breakdown are shown to you before booking and on your confirmation page.</P>

          <H3>3. Booking confirmation</H3>
          <P>A booking is confirmed upon successful payment. You will receive a booking reference and ticket via the platform. The tour operator will contact you if any changes to your booking are necessary.</P>

          <H3>4. Requirements</H3>
          <P>Some tours have minimum age or driving license requirements. For buggy and quad tours, a valid driving license (category B or A) is required. It is your responsibility to ensure you meet the requirements before booking. No refund will be issued if you are turned away at the activity for failing to meet stated requirements.</P>

          <H3>5. Liability</H3>
          <P>Tenerify.ai is a booking platform and is not liable for the conduct, quality, or safety of the tours themselves. All activities are subject to the terms and conditions of the individual tour operators. Participation in outdoor and adventure activities involves inherent risk.</P>

          <H3>6. Changes to these Terms</H3>
          <P>We may update these Terms at any time. Continued use of the service after changes constitutes acceptance.</P>

          <H3>Contact</H3>
          <P>Questions about these Terms: WhatsApp +34 610 434 957 or email forrestburns.booking@gmail.com</P>
        </Section>

        {/* Booking Conditions */}
        <Section id="booking-conditions" title="Booking Conditions">
          <P>The general conditions below apply on top of the Terms of Service and may be supplemented by the specific operator&apos;s own conditions, which will be shared with you on confirmation.</P>

          <H3>Boat trips, sailing & water sports</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li>Arrive at the meeting point (marina gate / pier shown on your ticket) at least 15–30 minutes before departure</li>
            <li>Trips are weather and sea-condition dependent and may be rescheduled or cancelled by the operator for safety reasons</li>
            <li>Bring swimwear, a towel, sun protection, and a valid photo ID</li>
            <li>Some activities (jet ski, parascending, fly fish) have minimum age and/or weight requirements as stated on the tour page</li>
          </ul>

          <H3>Buggy & quad tours</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li>Driver must be 18+ and hold a valid driving license (category B or A as applicable) — bring the physical license</li>
            <li>Hotel pickup time is confirmed the day before or on the morning of the activity</li>
            <li>Closed shoes and clothing you don&apos;t mind getting dusty/muddy are recommended</li>
            <li>The assigned operator and vehicle type may vary based on availability for your date</li>
          </ul>

          <H3>Theme parks & attraction tickets (Siam Park, Loro Parque, Aqualand, Jungle Park, Camel Park, etc.)</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li>Your booking confirmation serves as an e-ticket — present it (printed or on your phone) at the park entrance, along with photo ID if requested</li>
            <li>Tickets are valid only for the date selected at booking unless the park&apos;s own policy states otherwise</li>
            <li>Once inside the park, the park&apos;s own rules, opening hours, and conditions apply</li>
          </ul>

          <H3>Bus tours & island excursions</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li>Hotel pickup window is confirmed before the tour — please be ready and visible at the pickup point at the agreed time</li>
            <li>Itineraries may be adjusted by the guide due to weather, traffic, or local circumstances</li>
            <li>Late arrival at the pickup point may result in missing the tour with no refund</li>
          </ul>

          <H3>Vehicle rentals</H3>
          <P>A valid driving license, photo ID, and (where required by the rental operator) a credit card for the security deposit must be presented at pickup. The remaining balance after the online deposit is paid directly to the rental operator.</P>
        </Section>

        {/* Cancellation Policy */}
        <Section id="cancellation---refund-policy" title="Cancellation & Refund Policy">
          <P>We understand plans change. Cancellation terms may vary slightly by experience — the details below reflect the general policy that applies to all bookings made through Tenerify.ai.</P>

          <H3>Customer cancellations</H3>
          <div className="space-y-3 text-stone-300 text-sm leading-relaxed">
            <div className="bg-stone-900 border border-white/5 rounded-xl px-4 py-3 space-y-1">
              <p className="font-semibold text-white">More than 24 hours before the tour</p>
              <p>Full refund to your original payment method. Refunds are processed within 14 days.</p>
            </div>
            <div className="bg-stone-900 border border-white/5 rounded-xl px-4 py-3 space-y-1">
              <p className="font-semibold text-white">Less than 24 hours before the tour / no-show</p>
              <p>No refund. The full amount is forfeited as the experience slot cannot be re-sold at short notice.</p>
            </div>
          </div>

          <H3>Operator cancellations</H3>
          <P>If the tour operator cancels your booking (e.g. bad weather, safety reasons, or minimum group not reached), you will receive a full refund or the option to reschedule at no extra cost.</P>

          <H3>How to cancel</H3>
          <P>Contact us via WhatsApp at +34 610 434 957 with your booking reference. Please cancel as early as possible — cancellations must be received more than 24 hours before your tour start time to be eligible for a refund.</P>

          <H3>Non-refundable situations</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li>Cancellation within 24 hours of the tour start time</li>
            <li>No-show on the day of the tour</li>
            <li>Failure to meet tour requirements (minimum age, valid driving license)</li>
            <li>Late arrival causing you to miss the departure</li>
          </ul>

          <H3>Refund processing</H3>
          <P>All eligible refunds are returned to the original payment method used at checkout within 14 days of the cancellation request being confirmed.</P>
        </Section>

        {/* Privacy Policy */}
        <Section id="privacy-policy" title="Privacy Policy">
          <P>This Privacy Policy explains how Tenerify.ai collects, uses, and protects your personal data in accordance with the EU General Data Protection Regulation (GDPR) and Spanish data protection law (LOPDGDD).</P>

          <H3>Data controller</H3>
          <P>Spanish Dream Plus S.L., operating as Tenerify.ai, Tenerife, Canary Islands, Spain. Contact: forrestburns.booking@gmail.com — see Legal Notice above for full identification details.</P>

          <H3>What data we collect</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li><strong className="text-white">Name, email, phone number</strong> — collected by Stripe during payment checkout</li>
            <li><strong className="text-white">Payment data</strong> — processed by Stripe, Inc. We never see or store your full card details</li>
            <li><strong className="text-white">Chat session data</strong> — your conversation preferences (who you are, tour interests) stored anonymously for 90 days, then automatically deleted</li>
            <li><strong className="text-white">Booking details</strong> — tour, date, group size, stored as part of your Stripe payment record</li>
          </ul>

          <H3>Why we collect it</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li>To process your booking and payment (contract performance)</li>
            <li>To send you your ticket and booking confirmation</li>
            <li>To contact you about your booking if needed (e.g. schedule changes)</li>
            <li>To improve the AI recommendations (anonymised session data only)</li>
          </ul>

          <H3>Third parties</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li><strong className="text-white">Stripe, Inc.</strong> — payment processing. <a href="https://stripe.com/privacy" target="_blank" className="text-orange-400 hover:underline">Stripe Privacy Policy</a></li>
            <li><strong className="text-white">Anthropic, PBC</strong> — AI responses. Conversation content may be processed by Anthropic's API. No personal identifiers are sent.</li>
            <li><strong className="text-white">Upstash</strong> — anonymous session storage (90-day TTL)</li>
            <li><strong className="text-white">Vercel, Inc.</strong> — hosting infrastructure</li>
            <li><strong className="text-white">excursionstenerife.es</strong> — tour operator who receives your booking details to fulfil the service</li>
          </ul>

          <H3>Your rights (GDPR)</H3>
          <P>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at forrestburns.booking@gmail.com. You also have the right to lodge a complaint with the Spanish data protection authority (AEPD) at aepd.es.</P>

          <H3>Data retention</H3>
          <P>Chat session data: deleted after 90 days of inactivity. Booking/payment data: retained for 5 years as required by Spanish tax law. You may request deletion of non-financial data at any time.</P>

        </Section>

        {/* Cookie Policy */}
        <Section id="cookie-policy" title="Cookie Policy">
          <P>This Cookie Policy explains what cookies Tenerify.ai uses and why, in accordance with Spanish and EU law (LSSI-CE, ePrivacy Directive, and GDPR).</P>

          <H3>What is a cookie?</H3>
          <P>A cookie is a small text file stored on your device that lets a website remember information about your visit, such as your session or preferences.</P>

          <H3>Cookies we use</H3>
          <div className="space-y-3 text-stone-300 text-sm leading-relaxed">
            <div className="bg-stone-900 border border-white/5 rounded-xl px-4 py-3 space-y-1">
              <p className="font-semibold text-white"><code className="bg-stone-800 px-1 rounded text-xs">tfy_sid</code> — Session cookie (strictly necessary)</p>
              <p>Identifies your chat session so the AI remembers context within and across visits. Stored for up to 90 days. This cookie is essential for the service to work and does not require consent under EU law.</p>
            </div>
          </div>
          <P>We do not use any analytics, advertising, or third-party tracking cookies on Tenerify.ai.</P>

          <H3>Cookies set by third parties</H3>
          <P>When you proceed to payment, Stripe may set its own cookies on the <code className="bg-stone-800 px-1 rounded text-xs">checkout.stripe.com</code> domain to process your payment securely and prevent fraud. These are governed by <a href="https://stripe.com/cookies-policy/legal" target="_blank" className="text-orange-400 hover:underline">Stripe&apos;s Cookie Policy</a> and are outside our control.</P>

          <H3>Managing cookies</H3>
          <P>Because Tenerify.ai only uses one essential cookie required to operate the chat session, the notice shown on your first visit is informational rather than a consent request. You can still delete or block cookies at any time via your browser settings, but doing so may prevent the chat session from working correctly.</P>

          <H3>Changes to this policy</H3>
          <P>We may update this Cookie Policy if the cookies we use change. Any updates will be posted on this page with a new &quot;last updated&quot; date.</P>
        </Section>

        {/* Footer */}
        <div className="border-t border-white/5 pt-8 text-center">
          <p className="text-stone-600 text-xs">Tenerify.ai · Tenerife, Canary Islands, Spain</p>
          <p className="text-stone-700 text-xs mt-1">Questions? WhatsApp +34 610 434 957</p>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-8">
      <h2 className="text-xl font-bold border-b border-white/10 pb-3">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-white mt-6 mb-1">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-stone-300 text-sm leading-relaxed">{children}</p>;
}
