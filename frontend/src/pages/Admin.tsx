import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Check admin
  useEffect(() => {
    if (user && user.email !== 'akshanshkhairwar@gmail.com') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        // const data = await api.get('/books');
        // setBooks(data.books);
        
        // Mock
        setBooks([
          { id: '1', title: 'The Art of Silence', author: 'Priya Sharma', price: 499 },
          { id: '2', title: 'Letters to the Ganges', author: 'Raghav Iyer', price: 349 },
          { id: '3', title: 'Whispers of the Banyan', author: 'Ananya Devi', price: 599 },
        ]);
      } catch (error) {
        console.error('Failed to fetch books', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !price || !description || !pdfFile) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setUploading(true);
      
      // Simulate file upload
      setUploadProgress(20);
      
      // 1. Upload PDF
      // const pdfFormData = new FormData();
      // pdfFormData.append('file', pdfFile);
      // const pdfRes = await fetch('http://localhost:8787/api/upload/pdf', {
      //   method: 'POST',
      //   body: pdfFormData
      // });
      // const { pdfKey } = await pdfRes.json();
      
      setUploadProgress(60);

      // 2. Upload Cover (if any)
      // let coverKey = null;
      if (coverFile) {
        // const coverFormData = new FormData();
        // coverFormData.append('file', coverFile);
        // const coverRes = await fetch('http://localhost:8787/api/upload/cover', {
        //   method: 'POST',
        //   body: coverFormData
        // });
        // const coverData = await coverRes.json();
        // coverKey = coverData.coverKey;
      }
      
      setUploadProgress(80);

      // 3. Create book metadata
      // await api.post('/books', {
      //   title,
      //   author,
      //   price: Number(price),
      //   description,
      //   pdfKey: 'mock-pdf-key',
      //   coverKey
      // });

      setUploadProgress(100);
      
      // Reset form
      setTimeout(() => {
        setTitle('');
        setAuthor('');
        setPrice('');
        setDescription('');
        setPdfFile(null);
        setCoverFile(null);
        setUploading(false);
        setUploadProgress(0);
        alert('Book published successfully!');
        
        // Refresh list
        setBooks([{ id: Date.now().toString(), title, author, price: Number(price) }, ...books]);
      }, 500);
      
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        // await api.delete(`/books/${id}`);
        setBooks(books.filter(b => b.id !== id));
      } catch (error) {
        console.error('Failed to delete', error);
      }
    }
  };

  if (!user || user.email !== 'admin@historified.com') return null;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p className="text-brown-400 text-xs tracking-[0.2em] uppercase font-medium mb-2">Dashboard</p>
        <h1 className="font-serif text-3xl font-semibold text-brown-900">Manage Your Library</h1>
      </div>

      {/* Upload Form */}
      <div className="bg-cream-100 border border-cream-200 rounded-lg p-8">
        <h2 className="font-serif text-xl font-semibold text-brown-900 mb-6">Upload a New Book</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Book Title</label>
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
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Author</label>
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
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Price (₹)</label>
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
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Description</label>
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
              <label className="block text-sm font-medium text-brown-700 mb-1.5">PDF Document *</label>
              <div className="w-full bg-cream-50 border border-dashed border-cream-300 rounded-md p-6 flex flex-col items-center justify-center relative hover:border-brown-400 transition-colors">
                <input 
                  type="file" 
                  accept="application/pdf"
                  required
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
                  {pdfFile ? pdfFile.name : 'Select PDF'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Cover Image (Optional)</label>
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
                  {coverFile ? coverFile.name : 'Select Image'}
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
                  Uploading... {uploadProgress}%
                </span>
              </>
            ) : (
              'Publish Book'
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
              <div key={book.id} className="bg-cream-100 border border-cream-200 rounded-lg px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-brown-900">{book.title}</h3>
                  <p className="text-brown-400 text-xs mt-0.5">{book.author} · ₹{book.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-brown-500 hover:text-brown-900 text-sm font-medium transition-colors">Edit</button>
                  <button onClick={() => handleDelete(book.id)} className="text-red-800/70 hover:text-red-800 text-sm font-medium transition-colors">Delete</button>
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
