import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookCard } from '../components/BookCard';
import { api } from '../lib/api';

export function MyBooks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchMyBooks = async () => {
      try {
        setLoading(true);
        const data = await api.get('/user/purchases');
        setBooks(data.purchases || []);
      } catch (error) {
        console.error('Error fetching user books', error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyBooks();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 min-h-[70vh]">
      <div className="mb-10">
        <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-2">Your Library</p>
        <h1 className="font-serif text-3xl font-semibold text-brown-900">My Books</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {books.map((book) => (
            <div key={book.id} className="relative group">
              <BookCard {...book} />
              <div className="absolute top-4 right-4 bg-brown-900 text-cream-50 text-xs font-medium px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                Purchased
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-cream-100 rounded-lg border border-cream-200">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brown-300 mx-auto mb-4">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-2">Your library is empty</h2>
          <p className="text-brown-500 mb-6 max-w-md mx-auto">You haven't purchased any books yet. Explore our collection to find your next great read.</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-brown-900 text-cream-50 px-6 py-2.5 rounded-md hover:bg-brown-700 transition-colors cursor-pointer text-sm font-medium"
          >
            Browse Collection
          </button>
        </div>
      )}
    </main>
  );
}
