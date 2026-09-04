import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { isAdminEmail } from '../config/admin';
import { Ticket, Sparkles, Trash2, BookOpen, Plus, MessageSquare, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Navigation tab state: 'library' or 'support'
  const [activeTab, setActiveTab] = useState<'library' | 'support'>('library');

  // Library & Coupon state
  const [books, setBooks] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  
  // Book Edit vs Create state
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  
  // Book Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [existingPdfKey, setExistingPdfKey] = useState<string | null>(null);
  const [existingSamplePdfKey, setExistingSamplePdfKey] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('Publishing...');

  // Coupon Form state
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Contact / Support Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // Check admin
  useEffect(() => {
    if (user && !isAdminEmail(user.email)) {
      navigate('/');
    }
  }, [user, navigate]);

  const loadBooks = async () => {
    try {
      setLoadingBooks(true);
      const data = await api.get('/books');
      setBooks(data.books || []);
    } catch (error) {
      console.error('Failed to fetch books', error);
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const loadCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const data = await api.get('/coupons');
      setCoupons(data.coupons || []);
    } catch (error) {
      console.error('Failed to fetch coupons', error);
      setCoupons([]);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      const data = await api.get('/contact');
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch contact messages', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadBooks();
    loadCoupons();
    loadMessages();
  }, []);

  const unreadCount = messages.filter(m => m.status === 'UNREAD').length;

  const resetBookForm = () => {
    setEditingBookId(null);
    setTitle('');
    setAuthor('');
    setPrice('');
    setDescription('');
    setPdfFile(null);
    setCoverFile(null);
    setExistingCoverUrl(null);
    setExistingPdfKey(null);
    setExistingSamplePdfKey(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadStatusText('Publishing...');
  };

  const handleEditClick = (book: any) => {
    setEditingBookId(book.id);
    setTitle(book.title || '');
    setAuthor(book.author || '');
    setPrice(book.price ? book.price.toString() : '');
    setDescription(book.description || '');
    setExistingCoverUrl(book.cover_url || book.coverUrl || null);
    setExistingPdfKey(book.pdf_r2_key || book.pdfKey || null);
    setExistingSamplePdfKey(book.sample_pdf_r2_key || null);
    setPdfFile(null);
    setCoverFile(null);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to extract first 5 pages of a PDF into a 1.5MB sample Blob
  const extractFirst5PagesBlob = async (file: File): Promise<Blob> => {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { 
      ignoreEncryption: true,
      throwOnInvalidObject: false 
    });
    
    const sampleDoc = await PDFDocument.create();
    const totalPages = srcDoc.getPageCount();
    const pageCount = Math.min(5, totalPages);
    
    const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
    const copiedPages = await sampleDoc.copyPages(srcDoc, pageIndices);
    
    copiedPages.forEach((page: any) => sampleDoc.addPage(page));
    
    const samplePdfBytes = await sampleDoc.save();
    return new Blob([samplePdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !price || !description) {
      alert('Please fill all required text fields');
      return;
    }

    if (!editingBookId && !pdfFile) {
      alert('Please select a PDF document to publish a new book');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      setUploadStatusText('Preparing upload...');
      
      let pdf_r2_key = existingPdfKey;
      let sample_pdf_r2_key = existingSamplePdfKey;
      let cover_url = existingCoverUrl;

      // 1. Upload Main PDF
      if (pdfFile) {
        setUploadStatusText('Uploading main PDF file...');
        setUploadProgress(25);
        const pdfFormData = new FormData();
        pdfFormData.append('file', pdfFile);
        const pdfData = await api.uploadFile('/upload/pdf', pdfFormData);
        pdf_r2_key = pdfData.key || pdfData.pdf_r2_key;

        // 2. Auto-generate 5-page sample preview (~1.5 MB)
        try {
          setUploadStatusText('Extracting 5-page sample preview...');
          setUploadProgress(50);
          const sampleBlob = await extractFirst5PagesBlob(pdfFile);
          
          setUploadStatusText('Uploading 5-page sample preview...');
          setUploadProgress(65);
          const sampleFile = new File([sampleBlob], `sample_${pdfFile.name}`, { type: 'application/pdf' });
          const sampleFormData = new FormData();
          sampleFormData.append('file', sampleFile);
          const sampleData = await api.uploadFile('/upload/pdf', sampleFormData);
          sample_pdf_r2_key = sampleData.key || sampleData.pdf_r2_key;
          console.log('Sample PDF key generated & uploaded:', sample_pdf_r2_key);
        } catch (sampleErr) {
          console.error('Sample generation failed, using main PDF key as fallback:', sampleErr);
          // Fallback to main PDF key if extraction fails
          sample_pdf_r2_key = pdf_r2_key;
        }
      }
      
      // 3. Upload Cover Image
      if (coverFile) {
        setUploadStatusText('Uploading cover image...');
        setUploadProgress(80);
        const coverFormData = new FormData();
        coverFormData.append('file', coverFile);
        const coverData = await api.uploadFile('/upload/cover', coverFormData);
        cover_url = coverData.url || coverData.cover_url;
      }
      
      setUploadStatusText('Saving book to database...');
      setUploadProgress(90);

      // 4. Save or update book in D1 database
      if (editingBookId) {
        await api.put(`/books/${editingBookId}`, {
          title,
          author,
          price: Number(price),
          description,
          pdf_r2_key,
          sample_pdf_r2_key,
          cover_url
        });
      } else {
        await api.post('/books', {
          title,
          author,
          price: Number(price),
          description,
          pdf_r2_key,
          sample_pdf_r2_key,
          cover_url
        });
      }

      setUploadProgress(100);
      setUploadStatusText('Done!');
      
      setTimeout(() => {
        alert(editingBookId ? 'Book updated successfully!' : 'Book published successfully!');
        resetBookForm();
        loadBooks();
      }, 300);
      
    } catch (error: any) {
      console.error('Operation failed', error);
      alert(`Failed: ${error.message || 'An error occurred'}`);
      setUploading(false);
      setUploadProgress(0);
      setUploadStatusText('Publishing...');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await api.delete(`/books/${id}`);
        setBooks(books.filter(b => b.id !== id));
        if (editingBookId === id) {
          resetBookForm();
        }
      } catch (error) {
        console.error('Failed to delete book', error);
        alert('Failed to delete book');
      }
    }
  };

  // Generate random 6-character capital alphanumeric code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCouponCode(code);
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountAmount || Number(discountAmount) <= 0) {
      alert('Please enter a valid discount amount in ₹');
      return;
    }

    try {
      setCreatingCoupon(true);
      const res = await api.post('/coupons', {
        code: couponCode.trim().toUpperCase() || undefined,
        discount_amount: Number(discountAmount),
        max_uses: Number(maxUses) || 1
      });

      alert(`Coupon '${res.code}' created successfully!`);
      setCouponCode('');
      setDiscountAmount('');
      setMaxUses('1');
      loadCoupons();
    } catch (error: any) {
      console.error('Failed to create coupon', error);
      alert(`Coupon creation failed: ${error.message || 'Error occurred'}`);
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete coupon '${code}'?`)) {
      try {
        await api.delete(`/coupons/${id}`);
        setCoupons(coupons.filter(c => c.id !== id));
      } catch (error) {
        console.error('Failed to delete coupon', error);
        alert('Failed to delete coupon');
      }
    }
  };

  // Support Messages Handlers
  const handleUpdateMessageStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/contact/${id}/status`, { status: newStatus });
      setMessages(messages.map(m => m.id === id ? { ...m, status: newStatus } : m));
    } catch (error) {
      console.error('Failed to update message status', error);
      alert('Failed to update status');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this support message?')) {
      try {
        await api.delete(`/contact/${id}`);
        setMessages(messages.filter(m => m.id !== id));
      } catch (error) {
        console.error('Failed to delete message', error);
        alert('Failed to delete message');
      }
    }
  };

  if (!user || !isAdminEmail(user.email)) return null;

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cream-200 pb-6">
        <div>
          <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-1">Admin Dashboard</p>
          <h1 className="font-serif text-3xl font-semibold text-brown-900">Manage Your Platform</h1>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-2 bg-cream-100 p-1.5 rounded-lg border border-cream-200">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-brown-900 text-cream-50 shadow-sm'
                : 'text-brown-700 hover:text-brown-900 hover:bg-cream-200/50'
            }`}
          >
            <BookOpen size={16} />
            <span>Library &amp; Coupons</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer relative ${
              activeTab === 'support'
                ? 'bg-brown-900 text-cream-50 shadow-sm'
                : 'text-brown-700 hover:text-brown-900 hover:bg-cream-200/50'
            }`}
          >
            <MessageSquare size={16} />
            <span>Support Inquiries</span>
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: LIBRARY & COUPONS */}
      {activeTab === 'library' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN (Library & Book Management - 7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Upload/Edit Book Form */}
            <div className="bg-cream-100 border border-cream-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl font-semibold text-brown-900 flex items-center gap-2">
                  <BookOpen size={20} className="text-brown-700" />
                  <span>{editingBookId ? `Edit Book: "${title}"` : 'Upload a New Book'}</span>
                </h2>
                {editingBookId && (
                  <button
                    onClick={resetBookForm}
                    className="text-xs font-medium text-brown-500 hover:text-brown-900 bg-cream-50 px-3 py-1.5 rounded border border-cream-300 cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">Book Title *</label>
                  <input 
                    type="text" 
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. The Forgotten Scripts" 
                    className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1">Author *</label>
                    <input 
                      type="text" 
                      required
                      value={author}
                      onChange={e => setAuthor(e.target.value)}
                      placeholder="Author name" 
                      className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1">Price (₹) *</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder="499" 
                      className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">Description *</label>
                  <textarea 
                    rows={3} 
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of the book..." 
                    className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2 text-sm text-brown-900 placeholder-brown-300 resize-none focus:border-brown-400 focus:outline-none" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-brown-700 mb-1">
                      PDF Document {editingBookId ? '(Optional update)' : '*'}
                    </label>
                    <div className="w-full bg-cream-50 border border-dashed border-cream-300 rounded-md p-4 flex flex-col items-center justify-center relative hover:border-brown-400 transition-colors">
                      <input 
                        type="file" 
                        accept="application/pdf"
                        required={!editingBookId && !pdfFile}
                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      />
                      <p className="text-brown-500 text-xs font-medium text-center truncate max-w-full">
                        {pdfFile ? `${pdfFile.name} (${(pdfFile.size / (1024 * 1024)).toFixed(1)} MB)` : existingPdfKey ? 'Keep Existing PDF' : 'Select PDF'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brown-700 mb-1">
                      Cover Image {editingBookId ? '(Optional update)' : '(Optional)'}
                    </label>
                    <div className="w-full bg-cream-50 border border-dashed border-cream-300 rounded-md p-4 flex flex-col items-center justify-center relative hover:border-brown-400 transition-colors">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => setCoverFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      />
                      <p className="text-brown-500 text-xs font-medium text-center truncate max-w-full">
                        {coverFile ? coverFile.name : existingCoverUrl ? 'Keep Existing Cover' : 'Select Image'}
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-brown-900 text-cream-50 text-sm font-medium py-3 rounded-md hover:bg-brown-700 transition-colors cursor-pointer mt-2 disabled:opacity-70 relative overflow-hidden shadow-sm"
                >
                  {uploading ? (
                    <>
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-brown-700 transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cream-50"></div>
                        {uploadStatusText} ({uploadProgress}%)
                      </span>
                    </>
                  ) : (
                    editingBookId ? 'Update Book' : 'Publish Book'
                  )}
                </button>
              </form>
            </div>

            {/* Published Books List */}
            <div>
              <h2 className="font-serif text-xl font-semibold text-brown-900 mb-4">Published Books</h2>
              
              {loadingBooks ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brown-900"></div>
                </div>
              ) : books.length > 0 ? (
                <div className="space-y-3">
                  {books.map((book) => (
                    <div 
                      key={book.id} 
                      className={`bg-cream-100 border rounded-lg p-4 flex items-center justify-between transition-colors ${editingBookId === book.id ? 'border-brown-900 ring-1 ring-brown-900 bg-cream-200/50' : 'border-cream-200'}`}
                    >
                      <div>
                        <h3 className="text-sm font-medium text-brown-900">{book.title}</h3>
                        <p className="text-brown-500 text-xs mt-0.5">{book.author} · ₹{book.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditClick(book)}
                          className="text-brown-700 hover:text-brown-900 text-xs font-medium bg-cream-50 hover:bg-cream-200 px-3 py-1.5 rounded border border-cream-300 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteBook(book.id)} 
                          className="text-red-700 hover:text-red-900 text-xs font-medium bg-cream-50 hover:bg-red-50 px-3 py-1.5 rounded border border-cream-300 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-brown-500 text-sm">No books published yet.</p>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (Coupon Generator & Active Coupons - 5 Cols) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Create New Coupon Form */}
            <div className="bg-cream-100 border border-cream-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <h2 className="font-serif text-xl font-semibold text-brown-900 mb-6 flex items-center gap-2">
                <Ticket size={20} className="text-brown-700" />
                <span>Create a New Coupon</span>
              </h2>

              <form onSubmit={handleCouponSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-brown-700">Coupon Code</label>
                    <button 
                      type="button" 
                      onClick={generateCode}
                      className="text-xs font-medium text-brown-700 hover:text-brown-900 flex items-center gap-1 bg-cream-50 px-2 py-0.5 rounded border border-cream-300 cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Generate 6-Char Code</span>
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. STU7X9 (or click Generate)" 
                    maxLength={20}
                    className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2 text-sm text-brown-900 font-mono tracking-wider uppercase placeholder-brown-300 focus:border-brown-400 focus:outline-none" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1">Discount (₹) *</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(e.target.value)}
                      placeholder="100" 
                      className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1">Max Usages *</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={maxUses}
                      onChange={e => setMaxUses(e.target.value)}
                      placeholder="1" 
                      className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none" 
                    />
                  </div>
                </div>

                <p className="text-xs text-brown-500 italic">
                  Set usages to <strong>1</strong> for single-use DM discount codes.
                </p>

                <button 
                  type="submit"
                  disabled={creatingCoupon}
                  className="w-full bg-brown-900 text-cream-50 text-sm font-medium py-3 rounded-md hover:bg-brown-700 transition-colors cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
                >
                  {creatingCoupon ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cream-50"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Generate Coupon</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Active Coupons List */}
            <div>
              <h2 className="font-serif text-xl font-semibold text-brown-900 mb-4">Active Coupons</h2>
              
              {loadingCoupons ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brown-900"></div>
                </div>
              ) : coupons.length > 0 ? (
                <div className="space-y-3">
                  {coupons.map((coupon) => {
                    const isExhausted = coupon.times_used >= coupon.max_uses;
                    return (
                      <div 
                        key={coupon.id} 
                        className={`bg-cream-100 border rounded-lg p-4 flex items-center justify-between transition-colors ${isExhausted ? 'opacity-60 border-cream-200' : 'border-cream-300'}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm tracking-wider text-brown-900 bg-cream-50 px-2 py-0.5 rounded border border-cream-300">
                              {coupon.code}
                            </span>
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              -₹{coupon.discount_amount}
                            </span>
                          </div>
                          <p className="text-brown-500 text-xs mt-1.5">
                            Uses: <strong>{coupon.times_used}</strong> / {coupon.max_uses}
                            {isExhausted && <span className="text-red-700 font-medium ml-2">(Exhausted)</span>}
                          </p>
                        </div>

                        <button 
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)} 
                          className="text-red-700 hover:text-red-900 p-2 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Coupon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-brown-500 text-sm">No coupons generated yet.</p>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: SUPPORT INQUIRIES */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold text-brown-900 flex items-center gap-2">
              <MessageSquare size={22} className="text-brown-700" />
              <span>Customer Support Inquiries</span>
            </h2>
            <button
              onClick={loadMessages}
              className="text-xs font-medium text-brown-700 hover:text-brown-900 bg-cream-100 hover:bg-cream-200 px-3 py-1.5 rounded border border-cream-300 cursor-pointer"
            >
              Refresh Messages
            </button>
          </div>

          {loadingMessages ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-900"></div>
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isUnread = msg.status === 'UNREAD';
                const isResolved = msg.status === 'RESOLVED';

                return (
                  <div 
                    key={msg.id} 
                    className={`bg-cream-100 border rounded-xl p-6 shadow-sm transition-all ${
                      isUnread ? 'border-amber-400 ring-1 ring-amber-300 bg-amber-50/20' : 'border-cream-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cream-200">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif text-lg font-semibold text-brown-900">{msg.name}</h3>
                          
                          {/* Status Pill */}
                          {isUnread && (
                            <span className="text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle size={12} />
                              <span>UNREAD</span>
                            </span>
                          )}
                          {isResolved && (
                            <span className="text-xs font-semibold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>RESOLVED</span>
                            </span>
                          )}
                          {!isUnread && !isResolved && (
                            <span className="text-xs font-medium text-brown-500 bg-cream-200 px-2 py-0.5 rounded-full">
                              READ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <Mail size={14} className="text-brown-400" />
                          <a 
                            href={`mailto:${msg.email}?subject=Re:%20Support%20Inquiry%20-%20Historified`} 
                            className="text-brown-700 hover:text-brown-900 underline text-xs font-medium"
                          >
                            {msg.email}
                          </a>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-brown-400 text-xs font-mono">
                          {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Recent'}
                        </p>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="py-4 text-brown-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.message}
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-cream-200 flex flex-wrap items-center justify-between gap-3">
                      <a 
                        href={`mailto:${msg.email}?subject=Re:%20Support%20Inquiry%20-%20Historified`}
                        className="bg-brown-900 text-cream-50 px-4 py-2 rounded-md text-xs font-medium hover:bg-brown-700 transition-colors no-underline flex items-center gap-1.5 shadow-sm"
                      >
                        <Mail size={14} />
                        <span>Reply via Email</span>
                      </a>

                      <div className="flex items-center gap-2">
                        {isResolved ? (
                          <button
                            onClick={() => handleUpdateMessageStatus(msg.id, 'UNREAD')}
                            className="text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded border border-amber-200 cursor-pointer font-medium"
                          >
                            Mark Unread
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateMessageStatus(msg.id, 'RESOLVED')}
                            className="text-xs text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded border border-emerald-300 cursor-pointer font-medium flex items-center gap-1"
                          >
                            <CheckCircle2 size={13} />
                            <span>Mark Resolved</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-xs text-red-700 hover:text-red-900 bg-cream-50 hover:bg-red-50 p-2 rounded border border-cream-300 transition-colors cursor-pointer"
                          title="Delete Message"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-cream-100 border border-cream-200 rounded-xl p-12 text-center text-brown-500">
              <MessageSquare size={32} className="mx-auto text-brown-300 mb-3" />
              <p className="font-serif text-lg text-brown-900 mb-1">No support messages yet</p>
              <p className="text-xs text-brown-500">Customer contact inquiries submitted on /contact will appear here.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
