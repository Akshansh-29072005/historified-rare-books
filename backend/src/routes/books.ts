import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'

type Variables = {
  user: User
}

const books = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Get all books (public)
books.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, title, author, price, cover_url FROM books').all()
    c.header('Cache-Control', 'public, s-maxage=300, max-age=60')
    return c.json({ books: results || [] })
  } catch (error) {
    return c.json({ error: 'Failed to fetch books', details: (error as Error).message }, 500)
  }
})

// Get single book (public)
books.get('/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const book = await c.env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(id).first()
    
    if (!book) {
      return c.json({ error: 'Book not found' }, 404)
    }
    
    c.header('Cache-Control', 'public, s-maxage=300, max-age=60')
    return c.json({ book })
  } catch (error) {
    return c.json({ error: 'Failed to fetch book', details: (error as Error).message }, 500)
  }
})

// Create book (admin only)
books.post('/', authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json()
  const { title, author, description, price, cover_url, pdf_r2_key, pdfKey, sample_pdf_r2_key, total_pages, is_image_based } = body
  const keyToUse = pdf_r2_key || pdfKey || null
  const sampleKeyToUse = sample_pdf_r2_key || null
  
  const id = crypto.randomUUID()
  
  try {
    await c.env.DB.prepare(
      'INSERT INTO books (id, title, author, description, price, cover_url, pdf_r2_key, sample_pdf_r2_key, total_pages, is_image_based) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, title ?? null, author ?? null, description ?? null, price ?? null, cover_url ?? null, keyToUse ?? null, sampleKeyToUse ?? null, total_pages ?? null, is_image_based ? 1 : 0).run()
    
    // Automatically grant access to the admin who uploaded it
    try {
      const user = c.get('user');
      if (user && user.id) {
        await c.env.DB.prepare(
          'INSERT INTO purchases (id, user_id, book_id, cashfree_order_id, status) VALUES (?, ?, ?, ?, ?)'
        ).bind(crypto.randomUUID(), user.id, id, 'admin_upload', 'completed').run();
      }
    } catch (grantErr) {
      console.error('Failed to auto-grant access to admin', grantErr);
    }
    
    return c.json({ id, message: 'Book created successfully' }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create book', details: (error as Error).message }, 500)
  }
})

// Update book (admin only)
books.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const { title, author, description, price, cover_url, pdf_r2_key, pdfKey, sample_pdf_r2_key, total_pages, is_image_based } = body
  const keyToUse = pdf_r2_key || pdfKey || null
  
  try {
    await c.env.DB.prepare(
      'UPDATE books SET title = COALESCE(?, title), author = COALESCE(?, author), description = COALESCE(?, description), price = COALESCE(?, price), cover_url = COALESCE(?, cover_url), pdf_r2_key = COALESCE(?, pdf_r2_key), sample_pdf_r2_key = COALESCE(?, sample_pdf_r2_key), total_pages = COALESCE(?, total_pages), is_image_based = COALESCE(?, is_image_based) WHERE id = ?'
    ).bind(
      title ?? null, 
      author ?? null, 
      description ?? null, 
      price ?? null, 
      cover_url ?? null, 
      keyToUse ?? null, 
      sample_pdf_r2_key ?? null, 
      total_pages ?? null, 
      is_image_based !== undefined ? (is_image_based ? 1 : 0) : null, 
      id
    ).run()
    
    return c.json({ message: 'Book updated successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to update book', details: (error as Error).message }, 500)
  }
})

// Delete book (admin only)
books.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id')
  
  try {
    await c.env.DB.prepare('DELETE FROM books WHERE id = ?').bind(id).run()
    return c.json({ message: 'Book deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete book', details: (error as Error).message }, 500)
  }
})

export default books
