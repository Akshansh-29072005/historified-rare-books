import { useState } from 'react';

export function ContactUs() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10 text-center max-w-xl mx-auto">
        <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-2">Support &amp; Inquiries</p>
        <h1 className="font-serif text-4xl font-semibold text-brown-900 mb-4">Contact Us</h1>
        <p className="text-brown-500 text-base">Have a question about a book purchase, reading platform, or payment? We are here to help.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
        {/* Contact Info */}
        <div className="bg-cream-100 p-8 rounded-lg border border-cream-200 space-y-6">
          <h2 className="font-serif text-2xl font-semibold text-brown-900 mb-4">Get in Touch</h2>
          
          <div>
            <p className="text-xs text-brown-400 font-medium uppercase tracking-wider mb-1">Customer Support Email</p>
            <p className="text-brown-900 font-medium text-base">akshanshkhairwar@gmail.com</p>
          </div>

          <div>
            <p className="text-xs text-brown-400 font-medium uppercase tracking-wider mb-1">Operating Hours</p>
            <p className="text-brown-900 text-sm">Monday to Saturday: 9:00 AM – 7:00 PM IST</p>
          </div>

          <div>
            <p className="text-xs text-brown-400 font-medium uppercase tracking-wider mb-1">Business Name &amp; Platform</p>
            <p className="text-brown-900 text-sm font-serif">Historified Rare Books &amp; E-Library</p>
          </div>

          <div>
            <p className="text-xs text-brown-400 font-medium uppercase tracking-wider mb-1">Location</p>
            <p className="text-brown-900 text-sm">India</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-cream-100 p-8 rounded-lg border border-cream-200">
          <h2 className="font-serif text-2xl font-semibold text-brown-900 mb-4">Send a Message</h2>
          
          {submitted ? (
            <div className="bg-cream-50 border border-cream-300 rounded-md p-6 text-center">
              <p className="font-serif text-lg font-semibold text-brown-900 mb-2">Message Sent!</p>
              <p className="text-brown-500 text-sm">Thank you for reaching out. We will get back to you within 24 hours.</p>
              <button 
                onClick={() => setSubmitted(false)} 
                className="mt-4 text-xs font-medium text-brown-900 underline cursor-pointer"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">Your Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name" 
                  className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2.5 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2.5 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">Message</label>
                <textarea 
                  rows={4} 
                  required 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="How can we help you?" 
                  className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2.5 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none resize-none"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-brown-900 text-cream-50 py-3 rounded-md text-sm font-medium hover:bg-brown-700 transition-colors cursor-pointer"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
