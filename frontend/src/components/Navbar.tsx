import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Example admin check based on email, in production this should be a custom claim or DB check
  const isAdmin = user?.email === 'akshanshkhairwar@gmail.com';

  return (
    <header className="border-b border-cream-200 bg-cream-50 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="no-underline text-brown-900">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
              <path d="M8 7h6"/>
              <path d="M8 11h4"/>
            </svg>
            <span className="font-serif text-xl font-semibold tracking-wide">Historified Rare Books</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-brown-500 font-medium">
          <Link to="/" className="hover:text-brown-900 transition-colors no-underline text-brown-500">Browse</Link>
          {user && (
            <Link to="/my-books" className="hover:text-brown-900 transition-colors no-underline text-brown-500">My Books</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="hover:text-brown-900 transition-colors no-underline text-brown-500">Admin</Link>
          )}
          
          <div className="w-px h-4 bg-cream-300"></div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-cream-300" />
                )}
                <span className="text-brown-900">{user.displayName}</span>
              </div>
              <button 
                onClick={signOut}
                className="text-brown-500 hover:text-brown-900 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="bg-brown-900 text-cream-50 px-5 py-2.5 rounded-md hover:bg-brown-700 transition-colors cursor-pointer"
            >
              Sign in with Google
            </button>
          )}
        </nav>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-brown-900 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-cream-50 border-t border-cream-200 px-6 py-4 flex flex-col gap-4 shadow-lg">
          <Link to="/" className="text-brown-900 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Browse</Link>
          {user && (
            <Link to="/my-books" className="text-brown-900 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>My Books</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="text-brown-900 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
          )}
          
          <div className="h-px w-full bg-cream-200 my-2"></div>
          
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {user.photoURL && (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-cream-300" />
                )}
                <span className="text-brown-900 font-medium">{user.displayName}</span>
              </div>
              <button 
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="text-left text-brown-500 hover:text-brown-900 py-2 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { signInWithGoogle(); setMobileMenuOpen(false); }}
              className="bg-brown-900 text-cream-50 px-5 py-3 rounded-md hover:bg-brown-700 transition-colors w-full text-center cursor-pointer"
            >
              Sign in with Google
            </button>
          )}
        </div>
      )}
    </header>
  );
}
