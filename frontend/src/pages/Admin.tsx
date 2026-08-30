import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { isAdminEmail } from '../config/admin';
import { Ticket, Sparkles, Trash2, BookOpen, Plus } from 'lucide-react';

export function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Coupon Form state
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [creatingCoupon, setCreatingCoupon] = useState(false);

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

  useEffect(() => {
    loadBooks();
    loadCoupons();
  }, []);

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
    setUploading(false);
    setUploadProgress(0);
  };

  const handleEditClick = (book: any) => {
    setEditingBookId(book.id);
    setTitle(book.title || '');
    setAuthor(book.author || '');
    setPrice(book.price ? book.price.toString() : '');
    setDescription(book.description || '');
    setExistingCoverUrl(book.cover_url || book.coverUrl || null);
    setExistingPdfKey(book.pdf_r2_key || book.pdfKey || null);
    setPdfFile(null);
    setCoverFile(null);

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      
      let pdf_r2_key = existingPdfKey;
      let cover_url = existingCoverUrl;

      if (pdfFile) {
        setUploadProgress(30);
        const pdfFormData = new FormData();
        pdfFormData.append('file', pdfFile);
        const pdfData = await api.uploadFile('/upload/pdf', pdfFormData);
        pdf_r2_key = pdfData.key || pdfData.pdf_r2_key;
      }
      
      setUploadProgress(60);

      if (coverFile) {
        setUploadProgress(75);
        const coverFormData = new FormData();
        coverFormData.append('file', coverFile);
        const coverData = await api.uploadFile('/upload/cover', coverFormData);
        cover_url = coverData.url || coverData.cover_url;
      }
      
      setUploadProgress(90);

      if (editingBookId) {
        await api.put(`/books/${editingBookId}`, {
          title,
          author,
          price: Number(price),
          description,
          pdf_r2_key,
          cover_url
        });
      } else {
        await api.post('/books', {
          title,
          author,
          price: Number(price),
          description,
          pdf_r2_key,
          cover_url
        });
      }

      setUploadProgress(100);
      
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

  if (!user || !isAdminEmail(user.email)) return null;

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-1">Admin Dashboard</p>
        <h1 className="font-serif text-3xl font-semibold text-brown-900">Manage Your Platform</h1>
      </div>

      {/* Responsive 2-Column Grid Layout */}
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
                      {pdfFile ? pdfFile.name : existingPdfKey ? 'Keep Existing PDF' : 'Select PDF'}
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
                      {editingBookId ? 'Updating...' : 'Publishing...'} {uploadProgress}%
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
    </main>
  );
}
