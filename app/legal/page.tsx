export default function LegalPage() {
  const updated = "7 June 2026";

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
          {["Terms of Service", "Cancellation & Refund Policy", "Privacy Policy"].map((s) => (
            <a key={s} href={`#${s.toLowerCase().replace(/[^a-z]/g, "-")}`}
              className="text-orange-400 hover:text-orange-300 transition-colors">
              → {s}
            </a>
          ))}
        </nav>

        {/* Terms of Service */}
        <Section id="terms-of-service" title="Terms of Service">
          <P>Tenerify.ai is an AI-powered booking assistant for tours and experiences in Tenerife, Canary Islands, Spain. The service is operated by Alexandr Foy, an independent operator based in Tenerife.</P>
          <P>By using Tenerify.ai and making a payment through our platform, you agree to these Terms.</P>

          <H3>1. What we do</H3>
          <P>Tenerify.ai acts as a booking intermediary between customers and local tour operators in Tenerife. We facilitate the discovery, selection, and payment for experiences. The tours themselves are operated by our partner operators, primarily excursionstenerife.es.</P>

          <H3>2. Payments</H3>
          <P>All payments are processed securely by Stripe, Inc. Tenerify.ai receives payment on behalf of the tour operator and passes booking details to them. Your card data is handled exclusively by Stripe and never stored on our servers.</P>

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

        {/* Cancellation Policy */}
        <Section id="cancellation---refund-policy" title="Cancellation & Refund Policy">
          <P>We understand plans change. Here is how cancellations work on Tenerify.ai.</P>

          <H3>Customer cancellations</H3>
          <div className="space-y-3 text-stone-300 text-sm leading-relaxed">
            <div className="bg-stone-900 border border-white/5 rounded-xl px-4 py-3 space-y-1">
              <p className="font-semibold text-white">48+ hours before the tour</p>
              <p>Full refund to your original payment method. Processing time: 5–10 business days depending on your bank.</p>
            </div>
            <div className="bg-stone-900 border border-white/5 rounded-xl px-4 py-3 space-y-1">
              <p className="font-semibold text-white">24–48 hours before the tour</p>
              <p>50% refund.</p>
            </div>
            <div className="bg-stone-900 border border-white/5 rounded-xl px-4 py-3 space-y-1">
              <p className="font-semibold text-white">Less than 24 hours / no-show</p>
              <p>No refund. The full amount is forfeited.</p>
            </div>
          </div>

          <H3>Operator cancellations</H3>
          <P>If the tour operator cancels your booking (e.g. bad weather, minimum group not reached), you will receive a full refund or the option to reschedule at no extra cost.</P>

          <H3>Weather policy</H3>
          <P>Tenerife enjoys excellent weather year-round, but ocean and outdoor activities may occasionally be cancelled due to adverse conditions. In such cases, a full refund or reschedule will be offered.</P>

          <H3>How to cancel</H3>
          <P>To request a cancellation, contact us via WhatsApp at +34 610 434 957 with your booking reference. Cancellations must be requested before the cutoff time to qualify for a refund.</P>

          <H3>Non-refundable situations</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li>Failure to meet tour requirements (age, license)</li>
            <li>Late arrival causing you to miss the tour</li>
            <li>Cancellation within 24 hours of the tour start time</li>
          </ul>
        </Section>

        {/* Privacy Policy */}
        <Section id="privacy-policy" title="Privacy Policy">
          <P>This Privacy Policy explains how Tenerify.ai collects, uses, and protects your personal data in accordance with the EU General Data Protection Regulation (GDPR) and Spanish data protection law (LOPDGDD).</P>

          <H3>Data controller</H3>
          <P>Alexandr Foy, operating as Tenerify.ai, Tenerife, Canary Islands, Spain. Contact: forrestburns.booking@gmail.com</P>

          <H3>What data we collect</H3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-1 list-disc list-inside">
            <li><strong className="text-white">Name, email, phone number</strong> — collected by Stripe during payment checkout</li>
            <li><strong className="text-white">Payment data</strong> — processed by Stripe, Inc. We never see or store your full card details</li>
            <li><strong className="text-white">Chat session data</strong> — your conversation preferences (who you are, tour interests) stored anonymously for 7 days, then automatically deleted</li>
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
            <li><strong className="text-white">Upstash</strong> — anonymous session storage (7-day TTL)</li>
            <li><strong className="text-white">Vercel, Inc.</strong> — hosting infrastructure</li>
            <li><strong className="text-white">excursionstenerife.es</strong> — tour operator who receives your booking details to fulfil the service</li>
          </ul>

          <H3>Your rights (GDPR)</H3>
          <P>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at forrestburns.booking@gmail.com. You also have the right to lodge a complaint with the Spanish data protection authority (AEPD) at aepd.es.</P>

          <H3>Data retention</H3>
          <P>Chat session data: deleted after 7 days. Booking/payment data: retained for 5 years as required by Spanish tax law. You may request deletion of non-financial data at any time.</P>

          <H3>Cookies</H3>
          <P>Tenerify.ai uses a single session cookie (<code className="bg-stone-800 px-1 rounded text-xs">tfy_sid</code>) to maintain your chat session. No tracking or advertising cookies are used.</P>
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
