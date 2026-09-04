import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { load } from '@cashfreepayments/cashfree-js';
import { Eye, BookOpen, Tag, Check, X } from 'lucide-react';
import { api } from '../lib/api';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
    final_price: number;
    original_price: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [cashfreeInstance, setCashfreeInstance] = useState<any>(null);

  useEffect(() => {
    const isStaging = typeof window !== 'undefined' && (
      window.location.hostname.includes('staging') || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );
    load({ mode: isStaging ? 'sandbox' : 'production' }).then(setCashfreeInstance).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchBookAndStatus = async () => {
      try {
        setLoading(true);
        if (id) {
          // Check URL for Cashfree redirect verification
          const searchParams = new URLSearchParams(window.location.search);
          const orderId = searchParams.get('order_id');
          const urlCoupon = searchParams.get('coupon');
          
          let verifyPromise = Promise.resolve(false);
          if (user && orderId) {
            verifyPromise = api.post('/payment/verify', { 
              orderId,
              couponCode: urlCoupon || undefined
            }).then(verifyRes => {
              if (verifyRes.status === 'COMPLETED') {
                window.history.replaceState({}, document.title, window.location.pathname);
                return true;
              }
              return false;
            }).catch(err => {
              console.error('Order verification error', err);
              return false;
            });
          }

          const bookPromise = api.get(`/books/${id}`);
          let purchasesPromise = Promise.resolve({ purchases: [] });
          
          if (user) {
            purchasesPromise = api.get('/user/purchases').catch(err => {
              console.error('Error fetching user purchases', err);
              return { purchases: [] };
            });
          }

          const [bookData, purchasesData, isVerified] = await Promise.all([
            bookPromise,
            purchasesPromise,
            verifyPromise
          ]);
          
          setBook(bookData.book);
          
          if (isVerified) {
            setHasPurchased(true);
          } else if (user) {
            const purchased = purchasesData.purchases?.some((p: any) => p.id === id || p.book_id === id);
            if (purchased) {
              setHasPurchased(true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookAndStatus();
  }, [id, user]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    try {
      setValidatingCoupon(true);
      setCouponError(null);

      const res = await api.post('/coupons/validate', {
        code: couponInput.trim().toUpperCase(),
        bookId: id
      });

      if (res.valid) {
        setAppliedCoupon({
          code: res.code,
          discount_amount: res.discount_amount,
          final_price: res.final_price,
          original_price: res.original_price || book?.price || 0
        });
        setCouponError(null);
      } else {
        setCouponError(res.error || 'Invalid coupon code');
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      console.error('Coupon validation failed', err);
      setCouponError(err.message || 'Failed to validate coupon code');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handlePurchase = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    try {
      setProcessing(true);
      
      // 1. Initialize Cashfree SDK (sandbox on staging/localhost, production on prod)
      const isStaging = typeof window !== 'undefined' && (
        window.location.hostname.includes('staging') || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1'
      );
      const cashfree = cashfreeInstance || await load({
        mode: isStaging ? 'sandbox' : 'production',
      });
      
      // 2. Call backend to create order (passing applied coupon code if any)
      const orderData = await api.post('/payment/create-order', { 
        bookId: id,
        couponCode: appliedCoupon?.code || undefined,
        userId: user.uid,
        customerEmail: user.email,
        customerPhone: '9999999999',
        customerName: user.displayName || 'Customer'
      });
      
      // 3. Open checkout
      if (orderData.payment_session_id) {
        await cashfree.checkout({
          paymentSessionId: orderData.payment_session_id,
          redirectTarget: '_self'
        });
      } else {
        throw new Error('Could not generate Cashfree payment session');
      }
      
    } catch (error: any) {
      console.error('Payment failed', error);
      alert(`Payment failed: ${error.message || 'Please try again.'}`);
      setProcessing(false);
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

  const displayCover = book.cover_url || book.coverUrl;
  const currentPayablePrice = appliedCoupon ? appliedCoupon.final_price : book.price;

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 md:py-20">
      <div className="flex flex-col md:flex-row gap-12 lg:gap-20">
        {/* Cover */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex-shrink-0">
          <div className="bg-cream-100 rounded-lg overflow-hidden aspect-[3/4] flex items-end relative border border-cream-200 shadow-md">
            {displayCover && !imgError ? (
              <img 
                src={displayCover} 
                alt={book.title} 
                className="w-full h-full object-cover" 
                onError={() => setImgError(true)}
                fetchPriority="high"
              />
            ) : (
              <div className="relative z-10 w-full p-8 md:p-12">
                <p className="font-serif text-3xl lg:text-4xl font-semibold leading-snug text-brown-900 mb-2">{book.title}</p>
                <p className="text-brown-500 text-sm tracking-widest uppercase">{book.author}</p>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col justify-center">
          <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-3">Book Details</p>
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-brown-900 leading-tight mb-2">
            {book.title}
          </h1>
          <p className="text-lg md:text-xl text-brown-500 mb-8 font-serif italic">by {book.author}</p>
          
          <div className="prose prose-brown max-w-none text-brown-700 leading-relaxed mb-10">
            <p>{book.description}</p>
          </div>

          <div className="space-y-4">
            {/* Main Price & Purchase Card */}
            <div className="bg-cream-100 border border-cream-200 rounded-xl p-6 space-y-5 shadow-sm">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-brown-500 text-xs uppercase tracking-wider mb-0.5">Price</p>
                  {appliedCoupon ? (
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-bold text-brown-900">₹{appliedCoupon.final_price}</span>
                      <span className="text-sm text-brown-400 line-through">₹{book.price}</span>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Save ₹{appliedCoupon.discount_amount}
                      </span>
                    </div>
                  ) : (
                    <p className="font-serif text-2xl font-semibold text-brown-900">₹{book.price}</p>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  {!user ? (
                    <button 
                      onClick={signInWithGoogle}
                      className="w-full sm:w-auto bg-brown-900 text-cream-50 px-6 py-3.5 rounded-md hover:bg-brown-700 transition-colors font-medium cursor-pointer shadow-sm whitespace-nowrap"
                    >
                      Sign in to Purchase
                    </button>
                  ) : hasPurchased ? (
                    <button 
                      onClick={() => navigate(`/read/${id}`)}
                      className="w-full sm:w-auto bg-brown-900 text-cream-50 px-6 py-3.5 rounded-md hover:bg-brown-700 transition-colors font-medium cursor-pointer shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <BookOpen size={18} />
                      <span>Read Now</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handlePurchase}
                      disabled={processing}
                      className="w-full sm:w-auto bg-brown-900 text-cream-50 px-6 py-3.5 rounded-md hover:bg-brown-700 transition-colors font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cream-50"></div>
                          Processing...
                        </>
                      ) : (
                        `Purchase for ₹${currentPayablePrice}`
                      )}
                    </button>
                  )}

                  {/* DM for Student Discount Button */}
                  <a
                    href="https://www.instagram.com/historified_in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto bg-cream-50 hover:bg-cream-200 text-brown-900 border border-cream-300 px-5 py-3.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm no-underline whitespace-nowrap"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                    <span>DM for Student Discount</span>
                  </a>
                </div>
              </div>

              {/* Coupon Code Section (Only if not already purchased) */}
              {!hasPurchased && (
                <div className="pt-4 border-t border-cream-200">
                  {appliedCoupon ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-700" />
                        <span className="text-xs sm:text-sm font-medium text-emerald-950">
                          Coupon <strong className="font-mono">{appliedCoupon.code}</strong> Applied! (-₹{appliedCoupon.discount_amount} off)
                        </span>
                      </div>
                      <button 
                        onClick={handleRemoveCoupon}
                        className="text-xs text-red-700 hover:text-red-900 font-medium underline flex items-center gap-1 cursor-pointer"
                      >
                        <X size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex flex-col sm:flex-row items-stretch gap-2">
                      <div className="relative flex-grow">
                        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={e => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          placeholder="Have a Coupon Code? (e.g. STU7X9)"
                          className="w-full bg-cream-50 border border-cream-300 rounded-md pl-9 pr-4 py-2 text-xs sm:text-sm font-mono uppercase text-brown-900 placeholder-brown-400 focus:border-brown-400 focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={validatingCoupon || !couponInput.trim()}
                        className="bg-brown-900 text-cream-50 px-5 py-2 rounded-md hover:bg-brown-700 transition-colors text-xs sm:text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                      >
                        {validatingCoupon ? 'Validating...' : 'Apply'}
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <p className="text-xs text-red-700 mt-1.5 font-medium">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Read Free Sample Button */}
            <button
              onClick={() => navigate(`/read-sample/${id}`)}
              className="w-full bg-cream-50 hover:bg-cream-200 text-brown-900 border border-cream-300 py-3 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Eye size={18} />
              <span>Read Sample (First 5 Pages)</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
