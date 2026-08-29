import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { BookDetail } from './pages/BookDetail';
import { MyBooks } from './pages/MyBooks';
import { Reader } from './pages/Reader';
import { Admin } from './pages/Admin';
import './App.css';

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

  if (requireAdmin && user.email !== 'akshanshkhairwar@gmail.com') {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book/:id" element={<BookDetail />} />
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
      </div>
      
      {/* Footer - except on reader page */}
      <Routes>
        <Route path="/read/:id" element={null} />
        <Route path="*" element={
          <footer className="border-t border-cream-200 bg-cream-100 mt-auto">
            <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-brown-400 text-sm">&copy; 2026 Historified. All rights reserved.</p>
              <div className="flex gap-6 text-brown-400 text-sm">
                <a href="#" className="hover:text-brown-900 transition-colors no-underline text-brown-400">Privacy</a>
                <a href="#" className="hover:text-brown-900 transition-colors no-underline text-brown-400">Terms</a>
                <a href="#" className="hover:text-brown-900 transition-colors no-underline text-brown-400">Contact</a>
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
