import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { QrCode, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export function ManualPayment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signInWithGoogle } = useAuth();
  
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Parse state from BookDetail navigation
  const state = location.state as {
    final_price?: number;
    discount_amount?: number;
    coupon_code?: string;
  } | null;

  useEffect(() => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        if (id) {
          const bookData = await api.get(`/books/${id}`);
          setBook(bookData.book);
        }
        
        const settingsData = await api.get('/settings');
        if (settingsData.settings && settingsData.settings.upi_qr_code_url) {
          setQrCodeUrl(settingsData.settings.upi_qr_code_url);
        }
      } catch (error) {
        console.error('Error fetching data', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, user]);

  const payableAmount = state?.final_price || book?.price || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr || utr.trim().length < 8) {
      alert('Please enter a valid UTR / Transaction ID (usually 12 digits).');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/payment/manual-submit', {
        bookId: id,
        utr: utr.trim(),
        amount: payableAmount,
        couponCode: state?.coupon_code
      });
      setSuccess(true);
    } catch (error: any) {
      console.error('Failed to submit payment', error);
      alert(`Failed to submit payment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-brown-900 mb-4">Book not found</h1>
        <button onClick={() => navigate('/')} className="text-brown-500 hover:text-brown-900 underline cursor-pointer">Return home</button>
      </div>
    );
  }

  if (success) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 sm:p-12 shadow-sm">
          <CheckCircle2 size={64} className="mx-auto text-emerald-600 mb-6" />
          <h1 className="font-serif text-3xl font-semibold text-emerald-950 mb-4">Payment Submitted!</h1>
          <p className="text-emerald-800 text-lg mb-8 leading-relaxed">
            Thank you! We have received your payment request for <strong className="font-semibold">"{book.title}"</strong>.
            <br /><br />
            Our team is verifying the UTR <span className="font-mono bg-emerald-100 px-2 py-1 rounded text-sm font-bold">{utr}</span>. 
            Once verified, you will receive an email and immediate access to read the book!
          </p>
          <button 
            onClick={() => navigate('/')}
            className="bg-emerald-700 text-cream-50 px-8 py-3 rounded-md hover:bg-emerald-800 transition-colors font-medium cursor-pointer shadow-sm"
          >
            Return to Homepage
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="text-brown-500 hover:text-brown-900 text-sm font-medium mb-4 inline-flex items-center gap-1 cursor-pointer">
          &larr; Back to Book
        </button>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-brown-900 mb-2">Secure Manual Checkout</h1>
        <p className="text-brown-600">Complete your purchase for <strong>{book.title}</strong> via UPI.</p>
      </div>

      <div className="bg-cream-100 border border-cream-200 rounded-xl overflow-hidden shadow-sm">
        
        {/* Order Summary */}
        <div className="bg-brown-900 text-cream-50 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-brown-300 text-xs uppercase tracking-wider mb-1">Total Payable Amount</p>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold">₹{payableAmount}</span>
              {state?.discount_amount && (
                <span className="text-sm text-brown-300 line-through">₹{book.price}</span>
              )}
            </div>
          </div>
          {state?.discount_amount && (
            <div className="bg-brown-800 px-3 py-1.5 rounded text-sm font-medium border border-brown-700">
              Coupon {state.coupon_code} Applied! (-₹{state.discount_amount})
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* QR Code Section */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 bg-white border border-cream-300 rounded-xl shadow-inner text-center">
              <p className="text-brown-500 text-xs uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
                <QrCode size={16} /> Scan to Pay
              </p>
              
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 sm:w-56 sm:h-56 object-cover border border-cream-200 rounded-lg mb-4 p-2 bg-white" />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-cream-50 border-2 border-dashed border-cream-200 rounded-lg mb-4 flex flex-col items-center justify-center p-4">
                  <AlertCircle size={32} className="text-amber-500 mb-2" />
                  <p className="text-xs text-brown-500 font-medium text-center">QR Code not uploaded by Admin yet. Please wait.</p>
                </div>
              )}
              
              <p className="text-sm text-brown-700">
                Please scan the QR code using PhonePe, Google Pay, Paytm, or any UPI app and pay exactly <strong>₹{payableAmount}</strong>.
              </p>
            </div>

            {/* Form Section */}
            <div className="w-full md:w-1/2 space-y-6">
              <div>
                <h3 className="font-serif text-xl font-semibold text-brown-900 mb-2">Submit Payment Details</h3>
                <p className="text-sm text-brown-600 leading-relaxed">
                  After completing the payment, please enter the 12-digit UPI Transaction ID (UTR number) below so we can verify your order.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="utr" className="block text-sm font-medium text-brown-800 mb-1.5">
                    UTR / Transaction ID *
                  </label>
                  <input
                    type="text"
                    id="utr"
                    required
                    value={utr}
                    onChange={e => setUtr(e.target.value)}
                    placeholder="e.g. 312456789012"
                    className="w-full bg-white border border-cream-300 rounded-lg px-4 py-3 text-sm text-brown-900 font-mono focus:border-brown-500 focus:ring-1 focus:ring-brown-500 focus:outline-none transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !utr.trim()}
                  className="w-full bg-brown-900 text-cream-50 px-6 py-3.5 rounded-lg hover:bg-brown-800 transition-colors font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cream-50"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Submit for Verification
                    </>
                  )}
                </button>
              </form>
              
              <div className="bg-cream-50 border border-cream-200 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle size={16} className="text-brown-500 shrink-0 mt-0.5" />
                <p className="text-xs text-brown-600 leading-relaxed">
                  Your payment will be manually verified by our team. Access to the book will be granted within 1-2 hours after verification. You will receive an email confirmation.
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}
