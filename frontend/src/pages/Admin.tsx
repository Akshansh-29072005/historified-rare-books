import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit vs Create state
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  
  // Form state
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

  // Check admin
  useEffect(() => {
    if (user && user.email !== 'akshanshkhairwar@gmail.com') {
      navigate('/');
    }
  }, [user, navigate]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await api.get('/books');
      setBooks(data.books || []);
    } catch (error) {
      console.error('Failed to fetch books', error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const resetForm = () => {
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

    // Smooth scroll to top form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      // 1. Upload new PDF if selected
      if (pdfFile) {
        setUploadProgress(30);
        const pdfFormData = new FormData();
        pdfFormData.append('file', pdfFile);
        const pdfData = await api.uploadFile('/upload/pdf', pdfFormData);
        pdf_r2_key = pdfData.key || pdfData.pdf_r2_key;
      }
      
      setUploadProgress(60);

      // 2. Upload new Cover if selected
      if (coverFile) {
        setUploadProgress(75);
        const coverFormData = new FormData();
        coverFormData.append('file', coverFile);
        const coverData = await api.uploadFile('/upload/cover', coverFormData);
        cover_url = coverData.url || coverData.cover_url;
      }
      
      setUploadProgress(90);

      // 3. Save or update book in database
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
        resetForm();
        loadBooks();
      }, 300);
      
    } catch (error: any) {
      console.error('Operation failed', error);
      alert(`Failed: ${error.message || 'An error occurred'}`);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await api.delete(`/books/${id}`);
        setBooks(books.filter(b => b.id !== id));
        if (editingBookId === id) {
          resetForm();
        }
      } catch (error) {
        console.error('Failed to delete', error);
        alert('Failed to delete book');
      }
    }
  };

  if (!user || user.email !== 'akshanshkhairwar@gmail.com') return null;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-2">Dashboard</p>
        <h1 className="font-serif text-3xl font-semibold text-brown-900">Manage Your Library</h1>
      </div>

      {/* Form Section */}
      <div className="bg-cream-100 border border-cream-200 rounded-lg p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-xl font-semibold text-brown-900">
            {editingBookId ? `Edit Book: "${title}"` : 'Upload a New Book'}
          </h2>
          {editingBookId && (
            <button
              onClick={resetForm}
              className="text-xs font-medium text-brown-500 hover:text-brown-900 bg-cream-50 px-3 py-1.5 rounded border border-cream-300 cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Book Title *</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. The Forgotten Scripts" 
              className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2.5 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none focus:ring-1 focus:ring-brown-400" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Author *</label>
              <input 
                type="text" 
                required
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="Author name" 
                className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2.5 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none focus:ring-1 focus:ring-brown-400" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Price (₹) *</label>
              <input 
                type="number" 
                required
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="499" 
                className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2.5 text-sm text-brown-900 placeholder-brown-300 focus:border-brown-400 focus:outline-none focus:ring-1 focus:ring-brown-400" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Description *</label>
            <textarea 
              rows={3} 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the book..." 
              className="w-full bg-cream-50 border border-cream-300 rounded-md px-4 py-2.5 text-sm text-brown-900 placeholder-brown-300 resize-none focus:border-brown-400 focus:outline-none focus:ring-1 focus:ring-brown-400" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">
                PDF Document {editingBookId ? '(Leave empty to keep existing)' : '*'}
              </label>
              <div className="w-full bg-cream-50 border border-dashed border-cream-300 rounded-md p-6 flex flex-col items-center justify-center relative hover:border-brown-400 transition-colors">
                <input 
                  type="file" 
                  accept="application/pdf"
                  required={!editingBookId && !pdfFile}
                  onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brown-300 mb-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p className="text-brown-500 text-xs font-medium text-center">
                  {pdfFile ? pdfFile.name : existingPdfKey ? 'Keep Existing PDF (or click to change)' : 'Select PDF'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">
                Cover Image {editingBookId ? '(Leave empty to keep existing)' : '(Optional)'}
              </label>
              <div className="w-full bg-cream-50 border border-dashed border-cream-300 rounded-md p-6 flex flex-col items-center justify-center relative hover:border-brown-400 transition-colors">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setCoverFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brown-300 mb-2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <p className="text-brown-500 text-xs font-medium text-center">
                  {coverFile ? coverFile.name : existingCoverUrl ? 'Keep Existing Cover (or click to change)' : 'Select Image'}
                </p>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={uploading}
            className="w-full bg-brown-900 text-cream-50 text-sm font-medium py-3 rounded-md hover:bg-brown-700 transition-colors cursor-pointer mt-2 disabled:opacity-70 relative overflow-hidden"
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

      {/* Existing Books */}
      <div className="mt-12">
        <h2 className="font-serif text-xl font-semibold text-brown-900 mb-6">Published Books</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brown-900"></div>
          </div>
        ) : books.length > 0 ? (
          <div className="space-y-3">
            {books.map((book) => (
              <div 
                key={book.id} 
                className={`bg-cream-100 border rounded-lg px-6 py-4 flex items-center justify-between transition-colors ${editingBookId === book.id ? 'border-brown-900 ring-1 ring-brown-900 bg-cream-200/50' : 'border-cream-200'}`}
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
                    onClick={() => handleDelete(book.id)} 
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
    </main>
  );
}
