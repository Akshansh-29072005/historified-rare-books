import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Bookmark, ArrowLeft } from 'lucide-react';
import { api, getApiBaseUrl } from '../lib/api';

// Setup pdf.js worker to local self-hosted file
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Connecting to manuscript stream...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState(false);
  const [pageHeight, setPageHeight] = useState<number>(window.innerHeight - 70);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive page height calculation
  useEffect(() => {
    const handleResize = () => {
      setPageHeight(window.innerHeight - 70);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch PDF with Auth Token and Progress
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const initPdfAndProgress = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        setLoadingText('Connecting to digital manuscript...');
        
        if (id) {
          const token = await user.getIdToken();
          const baseUrl = getApiBaseUrl();
          const pdfUrl = `${baseUrl}/reader/${id}/pdf`;
          
          setLoadingText('Loading digital manuscript...');
          
          const loadingTask = pdfjs.getDocument({
            url: pdfUrl,
            httpHeaders: { 'Authorization': `Bearer ${token}` },
            rangeChunkSize: 262144, // 256 KB chunks
          });

          const progressPromise = api.get(`/reader/${id}/progress`).catch(err => {
            console.error('Error fetching progress', err);
            return null;
          });

          const [pdfDocument, progress] = await Promise.all([
            loadingTask.promise,
            progressPromise
          ]);

          setPdfDoc(pdfDocument);
          
          if (progress) {
            if (progress.last_read_page) setPageNumber(progress.last_read_page);
            if (progress.bookmarks) setBookmarks(typeof progress.bookmarks === 'string' ? JSON.parse(progress.bookmarks) : progress.bookmarks);
          }
        }
      } catch (error: any) {
        console.error('Error initializing PDF reader', error);
        setErrorMsg(error.message || 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    initPdfAndProgress();
  }, [id, user, navigate]);

  // Auto-save progress
  useEffect(() => {
    if (id && user && numPages) {
      const timeoutId = setTimeout(() => {
        api.put(`/reader/${id}/progress`, {
          last_read_page: pageNumber,
          bookmarks: JSON.stringify(bookmarks)
        }).catch(err => console.error('Failed to auto-save progress', err));
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [pageNumber, bookmarks, id, user, numPages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const changePage = (offset: number) => {
    setPageNumber(prev => {
      const newPage = prev + offset;
      return numPages ? Math.min(Math.max(1, newPage), numPages) : 1;
    });
  };

  const toggleBookmark = () => {
    setBookmarks(prev => 
      prev.includes(pageNumber)
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b)
    );
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Space' || e.key === 'PageDown') {
        e.preventDefault();
        changePage(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        changePage(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

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
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-2">Unable to Open Manuscript</h2>
          <p className="text-brown-500 text-sm mb-6">{errorMsg}</p>
          <button 
            onClick={() => navigate('/my-books')}
            className="bg-brown-900 text-cream-50 px-6 py-2.5 rounded-md text-sm font-medium hover:bg-brown-700 transition-colors cursor-pointer"
          >
            Return to My Books
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
      {/* Bookmarks Drawer Overlay */}
      {showBookmarksDrawer && (
        <div className="absolute top-0 right-0 bottom-14 w-80 bg-cream-100 border-l border-cream-300 shadow-2xl z-40 p-6 overflow-y-auto animate-slide-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-serif text-lg font-semibold text-brown-900 flex items-center gap-2">
              <Bookmark size={18} className="text-brown-700" />
              <span>Bookmarks</span>
            </h3>
            <button 
              onClick={() => setShowBookmarksDrawer(false)}
              className="text-brown-500 hover:text-brown-900 text-xs cursor-pointer font-medium"
            >
              Close ✕
            </button>
          </div>

          {bookmarks.length > 0 ? (
            <div className="space-y-2">
              {bookmarks.map((bmPage) => (
                <button
                  key={bmPage}
                  onClick={() => {
                    setPageNumber(bmPage);
                    setShowBookmarksDrawer(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex justify-between items-center cursor-pointer ${
                    pageNumber === bmPage 
                      ? 'bg-brown-900 text-cream-50' 
                      : 'bg-cream-50 text-brown-900 hover:bg-cream-200 border border-cream-300'
                  }`}
                >
                  <span>Page {bmPage}</span>
                  <Bookmark size={14} fill={pageNumber === bmPage ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-brown-400 text-sm italic">No bookmarks saved yet.</p>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-cream-100/40">
        {/* Previous Page Floating Arrow */}
        <button 
          onClick={() => changePage(-1)}
          disabled={pageNumber <= 1}
          title="Previous Page (Left Arrow)"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-cream-100/90 hover:bg-cream-200 text-brown-900 p-3 rounded-full border border-cream-300 shadow-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Next Page Floating Arrow */}
        <button 
          onClick={() => changePage(1)}
          disabled={pageNumber >= (numPages || 1)}
          title="Next Page (Right Arrow)"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-cream-100/90 hover:bg-cream-200 text-brown-900 p-3 rounded-full border border-cream-300 shadow-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronRight size={28} />
        </button>

        {/* PDF Canvas Container */}
        <div className="h-full w-full flex items-center justify-center overflow-auto p-1 sm:p-3 relative">
          {pdfDoc && (
            <div className="relative inline-block my-auto">
              <Document
                file={pdfDoc}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(err) => setErrorMsg(err.message || 'Error loading PDF')}
                className="flex flex-col items-center max-w-full"
                loading={
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
                    <p className="text-brown-500 text-xs font-serif italic">Rendering page {pageNumber}...</p>
                  </div>
                }
              >
                <Page 
                  pageNumber={pageNumber} 
                  height={pageHeight}
                  className="shadow-2xl rounded-sm overflow-hidden border border-cream-300"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  devicePixelRatio={Math.min(2, window.devicePixelRatio)}
                />
              </Document>

              {/* Anti-Piracy DRM Canvas Watermark */}
              {user?.email && (
                <div 
                  className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden opacity-[0.14]"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  <div className="transform -rotate-45 text-brown-900 font-mono text-xs sm:text-sm font-bold whitespace-nowrap tracking-widest uppercase select-none">
                    LICENSED TO {user.email} • HISTORIFIED RARE BOOKS
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <footer className="py-2.5 px-4 sm:px-8 bg-cream-100 border-t border-cream-200 flex items-center justify-between z-20 shrink-0 shadow-md">
        <button 
          onClick={() => navigate('/my-books')}
          className="flex items-center gap-1.5 text-brown-700 hover:text-brown-900 transition-colors bg-cream-50 px-3 py-1 rounded-full border border-cream-300 text-xs font-medium shadow-sm cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>My Books</span>
        </button>

        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="text-brown-700 hover:text-brown-900 disabled:opacity-30 p-1.5 rounded-full hover:bg-cream-200 cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-xs sm:text-sm font-medium text-brown-900 font-serif">
            Page {pageNumber} of {numPages || '--'}
          </span>
          
          <button 
            onClick={() => changePage(1)}
            disabled={pageNumber >= (numPages || 1)}
            className="text-brown-700 hover:text-brown-900 disabled:opacity-30 p-1.5 rounded-full hover:bg-cream-200 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleBookmark}
            className={`p-2 rounded-full border transition-colors cursor-pointer ${
              bookmarks.includes(pageNumber)
                ? 'bg-brown-900 text-cream-50 border-brown-900'
                : 'bg-cream-50 text-brown-700 hover:text-brown-900 border-cream-300'
            }`}
            title={bookmarks.includes(pageNumber) ? 'Remove Bookmark' : 'Bookmark Page'}
          >
            <Bookmark size={16} fill={bookmarks.includes(pageNumber) ? 'currentColor' : 'none'} />
          </button>

          <button 
            onClick={() => setShowBookmarksDrawer(!showBookmarksDrawer)}
            className="flex items-center gap-1.5 bg-cream-50 hover:bg-cream-200 text-brown-900 px-3 py-1 rounded-full border border-cream-300 text-xs font-medium shadow-sm cursor-pointer transition-colors"
          >
            <span>Bookmarks</span>
            {bookmarks.length > 0 && (
              <span className="bg-brown-900 text-cream-50 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {bookmarks.length}
              </span>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
