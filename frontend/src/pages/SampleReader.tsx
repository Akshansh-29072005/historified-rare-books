import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ArrowLeft, ShoppingBag, Lock } from 'lucide-react';
import { api, getApiBaseUrl } from '../lib/api';

// Setup pdf.js worker to local self-hosted file
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const MAX_SAMPLE_PAGES = 5;

export function SampleReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [book, setBook] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pageHeight, setPageHeight] = useState<number>(window.innerHeight - 110);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive page height
  useEffect(() => {
    const handleResize = () => {
      setPageHeight(window.innerHeight - 110);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch book details & set sample PDF URL
  useEffect(() => {
    const initSample = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        
        if (id) {
          try {
            const bookData = await api.get(`/books/${id}`);
            setBook(bookData.book);
          } catch (e) {
            console.error('Could not fetch book details', e);
          }

          const baseUrl = getApiBaseUrl();
          const samplePdfUrl = `${baseUrl}/reader/${id}/sample-pdf`;
          setPdfUrl(samplePdfUrl);
        }
      } catch (error: any) {
        console.error('Error initializing sample PDF', error);
        setErrorMsg(error.message || 'Failed to load free sample');
      } finally {
        setLoading(false);
      }
    };

    initSample();
  }, [id]);

  const changePage = (offset: number) => {
    setPageNumber(prev => {
      const newPage = prev + offset;
      return Math.min(Math.max(1, newPage), MAX_SAMPLE_PAGES);
    });
  };

  // Keyboard navigation
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
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-cream-50 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brown-900"></div>
        <p className="text-brown-500 font-serif text-sm italic">Opening 5-page sample...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-cream-50 p-6">
        <div className="text-center p-8 bg-cream-100 border border-cream-200 rounded-lg max-w-md">
          <h2 className="font-serif text-xl font-semibold text-brown-900 mb-2">Unable to Open Sample</h2>
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
      {/* Sample Banner Header */}
      <header className="px-4 sm:px-6 py-3 bg-brown-900 text-cream-50 flex items-center justify-between z-20 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/book/${id}`)}
            className="flex items-center gap-1.5 text-cream-200 hover:text-white transition-colors text-xs sm:text-sm font-medium cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-brown-700"></div>
          <span className="text-xs sm:text-sm font-serif font-medium text-cream-100 truncate max-w-[200px] sm:max-w-md">
            Free Sample: {book?.title || 'Book Manuscript'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block text-xs text-cream-300">
            Previewing 5 Pages
          </span>
          <button 
            onClick={() => navigate(`/book/${id}`)}
            className="bg-cream-100 hover:bg-white text-brown-900 text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <ShoppingBag size={14} />
            <span>Buy Full Edition {book?.price ? `(₹${book.price})` : ''}</span>
          </button>
        </div>
      </header>

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
          disabled={pageNumber >= MAX_SAMPLE_PAGES}
          title="Next Page (Right Arrow)"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-cream-100/90 hover:bg-cream-200 text-brown-900 p-3 rounded-full border border-cream-300 shadow-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronRight size={28} />
        </button>

        {/* PDF Document Canvas Container */}
        <div className="h-full w-full flex items-center justify-center overflow-auto p-1 sm:p-3 relative">
          {pdfUrl && (
            <Document
              file={pdfUrl}
              onLoadError={(err) => setErrorMsg(err.message || 'Error parsing sample PDF')}
              className="flex flex-col items-center max-w-full"
              loading={
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
                  <p className="text-brown-500 text-xs font-serif italic">Rendering sample page...</p>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                height={pageHeight}
                className="shadow-2xl rounded-sm overflow-hidden border border-cream-300 my-auto"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                devicePixelRatio={Math.min(2, window.devicePixelRatio)}
              />
            </Document>
          )}

          {/* Callout Overlay when reaching page 5 */}
          {pageNumber === MAX_SAMPLE_PAGES && (
            <div className="absolute inset-x-4 bottom-6 max-w-lg mx-auto bg-brown-900/95 text-cream-50 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-brown-700 flex flex-col items-center text-center z-40 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-brown-800 flex items-center justify-center mb-2 text-cream-200">
                <Lock size={20} />
              </div>
              <h3 className="font-serif text-lg font-semibold text-cream-100 mb-1">End of Free Sample</h3>
              <p className="text-xs text-cream-300 mb-4 max-w-xs leading-relaxed">
                You've reached page 5 of the sample. Purchase the complete edition for {book?.price ? `₹${book.price}` : 'full price'} to unlock all pages!
              </p>
              <button
                onClick={() => navigate(`/book/${id}`)}
                className="w-full bg-cream-100 hover:bg-white text-brown-900 font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm shadow-sm cursor-pointer"
              >
                Purchase Full Book ({book?.price ? `₹${book.price}` : 'Buy Now'})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <footer className="py-2.5 px-4 sm:px-8 bg-cream-100 border-t border-cream-200 flex items-center justify-between z-20 shrink-0 shadow-md">
        <button 
          onClick={() => navigate(`/book/${id}`)}
          className="flex items-center gap-1.5 text-brown-700 hover:text-brown-900 transition-colors bg-cream-50 px-3 py-1 rounded-full border border-cream-300 text-xs font-medium shadow-sm cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Exit Sample</span>
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
            Sample Page {pageNumber} of {MAX_SAMPLE_PAGES}
          </span>
          
          <button 
            onClick={() => changePage(1)}
            disabled={pageNumber >= MAX_SAMPLE_PAGES}
            className="text-brown-700 hover:text-brown-900 disabled:opacity-30 p-1.5 rounded-full hover:bg-cream-200 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button 
          onClick={() => navigate(`/book/${id}`)}
          className="flex items-center gap-1.5 bg-brown-900 hover:bg-brown-700 text-cream-50 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-sm cursor-pointer transition-colors"
        >
          <ShoppingBag size={14} />
          <span className="hidden sm:inline">Get Full Book</span>
        </button>
      </footer>
    </div>
  );
}
