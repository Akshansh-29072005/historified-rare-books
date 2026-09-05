import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { ScamWarningBanner } from './components/ScamWarningBanner';
import { Home } from './pages/Home';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsConditions } from './pages/TermsConditions';
import { RefundPolicy } from './pages/RefundPolicy';
import { ContactUs } from './pages/ContactUs';
import { isAdminEmail } from './config/admin';
import './App.css';
import { lazy, Suspense } from 'react';

const Reader = lazy(() => import('./pages/Reader').then(m => ({ default: m.Reader })));
const SampleReader = lazy(() => import('./pages/SampleReader').then(m => ({ default: m.SampleReader })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const BookDetail = lazy(() => import('./pages/BookDetail').then(m => ({ default: m.BookDetail })));
const MyBooks = lazy(() => import('./pages/MyBooks').then(m => ({ default: m.MyBooks })));

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  if (requireAdmin && !isAdminEmail(user.email)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ScamWarningBanner />
      <div className="flex-grow">
        <Suspense fallback={
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
          </div>
        }>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/read-sample/:id" element={<SampleReader />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/refunds" element={<RefundPolicy />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route 
            path="/my-books" 
            element={
              <ProtectedRoute>
                <MyBooks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/read/:id" 
            element={
              <ProtectedRoute>
                <Reader />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            } 
          />
        </Routes>
        </Suspense>
      </div>
      
      {/* Footer - except on reader pages */}
      <Routes>
        <Route path="/read/:id" element={null} />
        <Route path="/read-sample/:id" element={null} />
        <Route path="*" element={
          <footer className="border-t border-cream-200 bg-cream-100 mt-auto">
            <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex flex-col items-center md:items-start gap-1">
                <p className="font-serif text-lg font-semibold text-brown-900">Historified</p>
                <p className="text-brown-400 text-xs">&copy; 2026 Historified Rare Books. All prices in INR (₹).</p>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-brown-500 text-sm">
                <Link to="/contact" className="hover:text-brown-900 transition-colors no-underline text-brown-500">Contact Us</Link>
                <Link to="/terms" className="hover:text-brown-900 transition-colors no-underline text-brown-500">Terms &amp; Conditions</Link>
                <Link to="/refunds" className="hover:text-brown-900 transition-colors no-underline text-brown-500">Refunds &amp; Cancellations</Link>
                <Link to="/privacy" className="hover:text-brown-900 transition-colors no-underline text-brown-500">Privacy Policy</Link>
              </div>
            </div>
          </footer>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
