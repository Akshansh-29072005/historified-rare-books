export function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-2">Legal</p>
        <h1 className="font-serif text-4xl font-semibold text-brown-900 mb-4">Privacy Policy</h1>
        <p className="text-brown-400 text-sm">Last updated: August 2026</p>
      </div>

      <div className="prose prose-brown max-w-none text-brown-700 space-y-8 leading-relaxed">
        <section className="bg-cream-100 p-6 rounded-lg border border-cream-200">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-3">1. Information We Collect</h2>
          <p className="mb-2">We collect information to provide better services to our readers. When you sign in with Google or purchase digital books on Historified, we collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Personal Identification:</strong> Name, email address, and Google account profile picture.</li>
            <li><strong>Transaction Data:</strong> Details about payments, order references, and purchased book IDs via Cashfree.</li>
            <li><strong>Usage & Progress Data:</strong> Reading progress, bookmarks, and page interaction data.</li>
          </ul>
        </section>

        <section className="bg-cream-100 p-6 rounded-lg border border-cream-200">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-3">2. How We Use Information</h2>
          <p className="mb-2">We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To grant digital access to purchased e-books in your library.</li>
            <li>To process one-time payment transactions via Cashfree Payment Gateway.</li>
            <li>To synchronize your reading bookmarks and last-read page numbers across devices.</li>
            <li>To communicate updates, receipt confirmations, and customer support responses.</li>
          </ul>
        </section>

        <section className="bg-cream-100 p-6 rounded-lg border border-cream-200">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-3">3. Data Security & Storage</h2>
          <p>Your data is stored securely using Cloudflare D1 databases and Cloudflare R2 encrypted storage. Payment details are processed securely by Cashfree (PCI-DSS compliant). We do not store credit card numbers, CVVs, or banking passwords on our servers.</p>
        </section>

        <section className="bg-cream-100 p-6 rounded-lg border border-cream-200">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-3">4. Contact Us</h2>
          <p>If you have any questions or concerns regarding this Privacy Policy, please contact us at <strong>historified.rare.books@gmail.com</strong>.</p>
        </section>
      </div>
    </main>
  );
}
