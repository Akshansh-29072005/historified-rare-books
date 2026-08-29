import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { load } from '@cashfreepayments/cashfree-js';
import { api } from '../lib/api';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchBookAndStatus = async () => {
      try {
        setLoading(true);
        if (id) {
          const bookData = await api.get(`/books/${id}`);
          setBook(bookData.book);
          
          if (user) {
            try {
              const purchasesData = await api.get('/user/purchases');
              const purchased = purchasesData.purchases?.some((p: any) => p.book_id === id);
              setHasPurchased(!!purchased);
            } catch (err) {
              console.error('Error fetching user purchases', err);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching book', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookAndStatus();
  }, [id, user]);

  const handlePurchase = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    try {
      setProcessing(true);
      
      // 1. Initialize Cashfree SDK
      const cashfree = await load({
        mode: 'sandbox',
      });
      
      // 2. Call backend to create order
      const orderData = await api.post('/payment/create-order', { 
        bookId: id,
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

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 md:py-20">
      <div className="flex flex-col md:flex-row gap-12 lg:gap-20">
        {/* Cover */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex-shrink-0">
          <div className="bg-cream-100 rounded-lg overflow-hidden aspect-[3/4] flex items-end relative border border-cream-200 shadow-md">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
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

          <div className="bg-cream-100 border border-cream-200 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-brown-500 text-sm mb-1">Edition Price</p>
              <p className="font-serif text-2xl font-semibold text-brown-900">₹{book.price}</p>
            </div>
            
            <div className="w-full sm:w-auto">
              {!user ? (
                <button 
                  onClick={signInWithGoogle}
                  className="w-full sm:w-auto bg-brown-900 text-cream-50 px-8 py-3.5 rounded-md hover:bg-brown-700 transition-colors font-medium cursor-pointer shadow-sm"
                >
                  Sign in to Purchase
                </button>
              ) : hasPurchased ? (
                <button 
                  onClick={() => navigate(`/read/${id}`)}
                  className="w-full sm:w-auto bg-brown-900 text-cream-50 px-8 py-3.5 rounded-md hover:bg-brown-700 transition-colors font-medium cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                  Read Now
                </button>
              ) : (
                <button 
                  onClick={handlePurchase}
                  disabled={processing}
                  className="w-full sm:w-auto bg-brown-900 text-cream-50 px-8 py-3.5 rounded-md hover:bg-brown-700 transition-colors font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cream-50"></div>
                      Processing...
                    </>
                  ) : (
                    `Purchase for ₹${book.price}`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
