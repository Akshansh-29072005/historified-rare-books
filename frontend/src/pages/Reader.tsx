import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Bookmark, List, X, ArrowLeft } from 'lucide-react';

// Setup pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchPdfAndProgress = async () => {
      try {
        setLoading(true);
        // const { url } = await api.get(`/reader/${id}/pdf`);
        // setPdfUrl(url);
        
        // Mock PDF URL (use a public sample PDF for testing if needed, or null to simulate loading)
        // setPdfUrl('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf');
        
        // const { last_read_page, bookmarks: fetchedBookmarks } = await api.get(`/reader/${id}/progress`);
        // if (last_read_page) setPageNumber(last_read_page);
        // if (fetchedBookmarks) setBookmarks(fetchedBookmarks);
        
      } catch (error) {
        console.error('Error fetching PDF or progress', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPdfAndProgress();
  }, [id, user, navigate]);

  // Security measures
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
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Controls fading
  useEffect(() => {
    const resetControlsTimeout = () => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetControlsTimeout);
      container.addEventListener('touchstart', resetControlsTimeout);
    }
    
    resetControlsTimeout();

    return () => {
      if (container) {
        container.removeEventListener('mousemove', resetControlsTimeout);
        container.removeEventListener('touchstart', resetControlsTimeout);
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Save progress
  useEffect(() => {
    const saveProgress = async () => {
      if (pageNumber > 1) {
        try {
          // await api.put(`/reader/${id}/progress`, { last_read_page: pageNumber });
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

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  };

  const toggleBookmark = async () => {
    const isBookmarked = bookmarks.includes(pageNumber);
    const newBookmarks = isBookmarked 
      ? bookmarks.filter(b => b !== pageNumber)
      : [...bookmarks, pageNumber].sort((a, b) => a - b);
      
    setBookmarks(newBookmarks);
    
    try {
      // await api.put(`/reader/${id}/bookmarks`, { bookmarks: newBookmarks });
    } catch (error) {
      console.error('Failed to save bookmarks', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-cream-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full bg-cream-50 overflow-hidden relative select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-cream-100/90 to-transparent z-10 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={() => navigate(`/book/${id}`)}
          className="flex items-center gap-2 text-brown-700 hover:text-brown-900 transition-colors bg-cream-50/80 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <button 
          onClick={() => setShowBookmarks(true)}
          className="flex items-center gap-2 text-brown-700 hover:text-brown-900 transition-colors bg-cream-50/80 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm"
        >
          <List size={18} />
          <span className="text-sm font-medium">Bookmarks</span>
        </button>
      </div>

      {/* PDF Viewer */}
      <div className="h-full w-full flex items-center justify-center overflow-auto p-4 md:p-12 pb-24">
        {pdfUrl ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col items-center max-w-full"
            loading={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>}
          >
            <Page 
              pageNumber={pageNumber} 
              className="shadow-xl"
              renderTextLayer={false}
              renderAnnotationLayer={false}
              devicePixelRatio={Math.min(2, window.devicePixelRatio)}
            />
          </Document>
        ) : (
          <div className="text-brown-500 font-serif text-lg">
            (PDF Document rendering simulated)
            <div className="mt-4 text-center">
              Page {pageNumber} of {numPages || 100}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-cream-100/95 backdrop-blur-md border border-cream-200 rounded-full shadow-lg px-6 py-3 flex items-center gap-6 z-10 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={() => changePage(-1)}
          disabled={pageNumber <= 1}
          className="text-brown-700 hover:text-brown-900 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        
        <span className="text-sm font-medium text-brown-900 min-w-[80px] text-center font-serif">
          {pageNumber} <span className="text-brown-400">/</span> {numPages || 100}
        </span>
        
        <button 
          onClick={() => changePage(1)}
          disabled={pageNumber >= (numPages || 100)}
          className="text-brown-700 hover:text-brown-900 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={24} />
        </button>

        <div className="w-px h-6 bg-cream-300"></div>

        <button 
          onClick={toggleBookmark}
          className={`${bookmarks.includes(pageNumber) ? 'text-brown-900' : 'text-brown-400 hover:text-brown-700'} transition-colors`}
        >
          <Bookmark size={20} fill={bookmarks.includes(pageNumber) ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Bookmarks Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-cream-50 border-l border-cream-200 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${showBookmarks ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-100">
          <h2 className="font-serif text-lg font-semibold text-brown-900">Bookmarks</h2>
          <button onClick={() => setShowBookmarks(false)} className="text-brown-500 hover:text-brown-900">
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
                    className="w-full text-left px-4 py-3 rounded-md hover:bg-cream-100 text-brown-700 text-sm flex justify-between items-center group transition-colors"
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
