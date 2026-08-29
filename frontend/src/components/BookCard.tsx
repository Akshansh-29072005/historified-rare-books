import { useState } from 'react';
import { Link } from 'react-router-dom';

export interface BookCardProps {
  id: string;
  title: string;
  author: string;
  price: number;
  coverUrl?: string;
  cover_url?: string;
  gradient?: string;
}

export function BookCard({ id, title, author, price, coverUrl, cover_url, gradient = 'bg-gradient-to-br from-amber-200 to-orange-100' }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const displayCover = cover_url || coverUrl;

  return (
    <article className="group flex flex-col h-full">
      <Link to={`/book/${id}`} className="no-underline text-inherit block">
        {/* Cover */}
        <div className="bg-cream-100 rounded-lg overflow-hidden mb-4 aspect-[3/4] flex items-end relative border border-cream-200 group-hover:border-brown-400 transition-colors shadow-sm group-hover:shadow-md">
          {displayCover && !imgError ? (
            <img 
              src={displayCover} 
              alt={title} 
              className="w-full h-full object-cover" 
              onError={() => setImgError(true)}
            />
          ) : (
            <>
              <div className={`absolute inset-0 opacity-[0.07] ${gradient}`} />
              <div className="relative z-10 w-full p-5">
                <p className="font-serif text-lg font-semibold leading-snug text-brown-900 mb-1">{title}</p>
                <p className="text-brown-400 text-xs tracking-wide uppercase">{author}</p>
              </div>
            </>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="px-1 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-3 flex-grow">
          <Link to={`/book/${id}`} className="no-underline block">
            <h3 className="font-medium text-brown-900 text-sm hover:text-brown-700 transition-colors line-clamp-2">{title}</h3>
            <p className="text-brown-400 text-xs mt-0.5">{author}</p>
          </Link>
          <span className="text-brown-700 font-semibold text-sm ml-2 shrink-0">₹{price}</span>
        </div>
        <Link to={`/book/${id}`} className="block w-full text-center text-sm font-medium py-2.5 rounded-md border border-brown-900 text-brown-900 hover:bg-brown-900 hover:text-cream-50 transition-colors cursor-pointer no-underline mt-auto">
          View Details
        </Link>
      </div>
    </article>
  );
}
