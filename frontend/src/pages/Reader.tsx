import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Bookmark, List, X, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';

// Setup pdf.js worker matching the exact pdfjs version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Fetching e-book stream...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [pageWidth, setPageWidth] = useState<number>(Math.min(window.innerWidth - 48, 800));
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive page width
  useEffect(() => {
    const handleResize = () => {
      setPageWidth(Math.min(window.innerWidth - 48, 800));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial fetch with Auth token
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    let createdObjectUrl: string | null = null;

    const fetchPdfAndProgress = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        setLoadingText('Connecting to secure PDF stream...');
        
        if (id) {
          const token = await user.getIdToken();
          
          setLoadingText('Downloading digital manuscript...');
          
          // Authenticated fetch for PDF stream
          const res = await fetch(`https://backend.akshanshkhairwar2.workers.dev/api/reader/${id}/pdf`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.details || `HTTP ${res.status}`);
          }
          
          setLoadingText('Preparing reader view...');
          const blob = await res.blob();
          createdObjectUrl = URL.createObjectURL(blob);
          setPdfUrl(createdObjectUrl);
          
          try {
            const progress = await api.get(`/reader/${id}/progress`);
            if (progress.last_read_page) setPageNumber(progress.last_read_page);
            if (progress.bookmarks) setBookmarks(typeof progress.bookmarks === 'string' ? JSON.parse(progress.bookmarks) : progress.bookmarks);
          } catch (err) {
            console.error('Error fetching progress', err);
          }
        }
      } catch (error: any) {
        console.error('Error fetching PDF', error);
        setErrorMsg(error.message || 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    fetchPdfAndProgress();

    return () => {
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [id, user, navigate]);

  const changePage = (offset: number) => {
    setPageNumber(prev => {
      const newPage = prev + offset;
      if (numPages > 0) {
        return Math.min(Math.max(1, newPage), numPages);
      }
      return Math.max(1, newPage);
    });
  };

  // Keyboard navigation & security rules
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+S, Ctrl+P, Ctrl+Shift+I, F12
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'p')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        return;
      }

      // Page Navigation Shortcuts
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Space' || e.key === 'PageDown') {
        e.preventDefault();
        changePage(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        changePage(-1);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [numPages]);

  // Save progress
  useEffect(() => {
    const saveProgress = async () => {
      if (pageNumber > 1 && id) {
        try {
          await api.put(`/reader/${id}/progress`, { last_read_page: pageNumber });
        } catch (error) {
          console.error('Failed to save progress', error);
        }
      }
    };
    
    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [pageNumber, id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const toggleBookmark = async () => {
    const isBookmarked = bookmarks.includes(pageNumber);
    const newBookmarks = isBookmarked 
      ? bookmarks.filter(b => b !== pageNumber)
      : [...bookmarks, pageNumber].sort((a, b) => a - b);
      
    setBookmarks(newBookmarks);
    
    if (id) {
      try {
        await api.put(`/reader/${id}/progress`, { bookmarks: JSON.stringify(newBookmarks) });
      } catch (error) {
        console.error('Failed to save bookmarks', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-cream-50 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brown-900"></div>
        <p className="text-brown-500 font-serif text-sm italic">{loadingText}</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-cream-50 p-6">
        <div className="text-center p-8 bg-cream-100 border border-cream-200 rounded-lg max-w-md">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-2">Unable to Open Reader</h2>
          <p className="text-brown-500 text-sm mb-6">{errorMsg}</p>
          <button 
            onClick={() => navigate(`/book/${id}`)}
            className="bg-brown-900 text-cream-50 px-6 py-2.5 rounded-md text-sm font-medium hover:bg-brown-700 transition-colors cursor-pointer"
          >
            Return to Book Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full bg-cream-50 overflow-hidden relative select-none flex flex-col"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Top Bar */}
      <header className="px-6 py-4 flex justify-between items-center bg-cream-100/90 border-b border-cream-200 z-20 shrink-0">
        <button 
          onClick={() => navigate(`/book/${id}`)}
          className="flex items-center gap-2 text-brown-700 hover:text-brown-900 transition-colors bg-cream-50 px-4 py-2 rounded-full border border-cream-300 shadow-sm cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Details</span>
        </button>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowBookmarks(true)}
            className="flex items-center gap-2 text-brown-700 hover:text-brown-900 transition-colors bg-cream-50 px-4 py-2 rounded-full border border-cream-300 shadow-sm cursor-pointer"
          >
            <List size={18} />
            <span className="text-sm font-medium">Bookmarks ({bookmarks.length})</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Previous Page Side Floating Arrow */}
        <button 
          onClick={() => changePage(-1)}
          disabled={pageNumber <= 1}
          title="Previous Page (Left Arrow)"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-cream-100/90 hover:bg-cream-200 text-brown-900 p-3 rounded-full border border-cream-300 shadow-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Next Page Side Floating Arrow */}
        <button 
          onClick={() => changePage(1)}
          disabled={numPages > 0 && pageNumber >= numPages}
          title="Next Page (Right Arrow)"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-cream-100/90 hover:bg-cream-200 text-brown-900 p-3 rounded-full border border-cream-300 shadow-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronRight size={28} />
        </button>

        {/* PDF Document Canvas Container */}
        <div className="h-full w-full flex items-center justify-center overflow-auto p-4 md:p-8">
          {pdfUrl && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => setErrorMsg(err.message || 'Error parsing PDF file')}
              onSourceError={(err) => setErrorMsg(err.message || 'Error loading PDF stream')}
              className="flex flex-col items-center max-w-full"
              loading={
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
                  <p className="text-brown-500 text-xs font-serif italic">Rendering page...</p>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                width={pageWidth}
                className="shadow-2xl rounded-sm overflow-hidden border border-cream-300"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                devicePixelRatio={Math.min(2, window.devicePixelRatio)}
              />
            </Document>
          )}
        </div>
      </div>

      {/* Bottom Sticky Control Bar */}
      <footer className="py-3 px-6 bg-cream-100 border-t border-cream-200 flex items-center justify-center gap-6 z-20 shrink-0">
        <button 
          onClick={() => changePage(-1)}
          disabled={pageNumber <= 1}
          className="text-brown-700 hover:text-brown-900 disabled:opacity-30 transition-colors p-2 rounded-full hover:bg-cream-200 cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-brown-900 font-serif">
            Page {pageNumber} of {numPages || '...'}
          </span>
        </div>
        
        <button 
          onClick={() => changePage(1)}
          disabled={numPages > 0 && pageNumber >= numPages}
          className="text-brown-700 hover:text-brown-900 disabled:opacity-30 transition-colors p-2 rounded-full hover:bg-cream-200 cursor-pointer"
          title="Next Page"
        >
          <ChevronRight size={24} />
        </button>

        <div className="w-px h-6 bg-cream-300 mx-2"></div>

        <button 
          onClick={toggleBookmark}
          className={`${bookmarks.includes(pageNumber) ? 'text-brown-900' : 'text-brown-400 hover:text-brown-700'} p-2 rounded-full hover:bg-cream-200 transition-colors cursor-pointer`}
          title={bookmarks.includes(pageNumber) ? 'Remove Bookmark' : 'Bookmark Page'}
        >
          <Bookmark size={20} fill={bookmarks.includes(pageNumber) ? 'currentColor' : 'none'} />
        </button>
      </footer>

      {/* Bookmarks Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-cream-50 border-l border-cream-200 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${showBookmarks ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-100">
          <h2 className="font-serif text-lg font-semibold text-brown-900">Bookmarks</h2>
          <button onClick={() => setShowBookmarks(false)} className="text-brown-500 hover:text-brown-900 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {bookmarks.length === 0 ? (
            <p className="text-brown-400 text-sm text-center mt-10">No bookmarks yet</p>
          ) : (
            <ul className="space-y-2">
              {bookmarks.map(page => (
                <li key={page}>
                  <button 
                    onClick={() => {
                      setPageNumber(page);
                      setShowBookmarks(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-md hover:bg-cream-100 text-brown-700 text-sm flex justify-between items-center group transition-colors cursor-pointer"
                  >
                    <span>Page {page}</span>
                    <Bookmark size={14} className="opacity-0 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Overlay for closing sidebar */}
      {showBookmarks && (
        <div 
          className="fixed inset-0 bg-brown-900/10 z-40"
          onClick={() => setShowBookmarks(false)}
        />
      )}
    </div>
  );
}
