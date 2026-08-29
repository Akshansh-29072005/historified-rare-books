import { useState, useEffect } from 'react';
import { BookCard } from '../components/BookCard';
import { api } from '../lib/api';

export function Home() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const data = await api.get('/books');
        setBooks(data.books || []);
      } catch (error) {
        console.error('Error fetching books', error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const filteredBooks = books.filter(book => 
    book.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    book.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main>
      {/* Hero */}
      <section className="bg-cream-100 border-b border-cream-200">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-4">Welcome to Historified</p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-brown-900 leading-tight max-w-2xl mb-6">
            Where rare stories find <em className="italic font-normal">their readers.</em>
          </h1>
          <p className="text-brown-500 text-base md:text-lg max-w-xl leading-relaxed mb-10">
            Purchase once, read forever. Our curated library of original works is designed for readers who value craftsmanship and quiet beauty.
          </p>

          {/* Search */}
          <div className="flex max-w-md shadow-sm">
            <input
              type="text"
              placeholder="Search titles or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-cream-50 border border-cream-300 rounded-l-md px-4 py-3 text-sm text-brown-900 placeholder-brown-300 focus:outline-none focus:border-brown-400 focus:ring-1 focus:ring-brown-400 transition-all"
            />
            <button className="bg-brown-900 text-cream-50 px-5 py-3 rounded-r-md text-sm font-medium hover:bg-brown-700 transition-colors cursor-pointer border border-brown-900">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Book Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16 min-h-[500px]">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown-900">Our Collection</h2>
            <p className="text-brown-400 text-sm mt-1">Handpicked works from exceptional authors</p>
          </div>
          <span className="text-brown-400 text-sm font-medium bg-cream-100 px-3 py-1 rounded-full border border-cream-200">
            {filteredBooks.length} titles
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-cream-100 rounded-lg border border-cream-200">
            <p className="text-brown-500 mb-2">
              {searchQuery ? `No books found matching "${searchQuery}"` : 'No books published yet.'}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-brown-900 font-medium hover:underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
