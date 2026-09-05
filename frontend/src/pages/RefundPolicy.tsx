export function RefundPolicy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-2">Legal</p>
        <h1 className="font-serif text-4xl font-semibold text-brown-900 mb-4">Refunds &amp; Cancellations Policy</h1>
        <p className="text-brown-400 text-sm">Last updated: August 2026</p>
      </div>

      <div className="prose prose-brown max-w-none text-brown-700 space-y-8 leading-relaxed">
        <section className="bg-cream-100 p-6 rounded-lg border border-cream-200">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-3">1. Digital Products Policy</h2>
          <p>Historified sells non-tangible, irrevocable digital e-books. Once access to an e-book is unlocked upon successful payment, we generally do not issue refunds or allow order cancellations due to the immediate digital nature of the content.</p>
        </section>

        <section className="bg-cream-100 p-6 rounded-lg border border-cream-200">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-3">2. Exceptional Refund Eligibility</h2>
          <p className="mb-2">We want our readers to be completely satisfied. You may be eligible for a full refund or order cancellation under the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Duplicate Payment:</strong> You were charged multiple times for a single book transaction due to a payment gateway technical error.</li>
            <li><strong>Technical Failure:</strong> Payment was debited from your account, but access to the book was not granted and our technical team is unable to resolve access within 48 hours.</li>
          </ul>
        </section>

        <section className="bg-cream-100 p-6 rounded-lg border border-cream-200">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-3">3. How to Request a Refund</h2>
          <p className="mb-2">To submit a refund or cancellation request, please email customer support at <strong>historified.rare.books@gmail.com</strong> with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your Google Account email address</li>
            <li>Cashfree Order ID / Transaction Reference Number</li>
            <li>Date and amount of the transaction in INR (₹)</li>
            <li>Detailed reason for the refund request</li>
          </ul>
          <p className="mt-3">Eligible refunds will be approved within 3 to 5 business days and credited back to the original payment source via Cashfree within 7 to 10 working days.</p>
        </section>
      </div>
    </main>
  );
}
