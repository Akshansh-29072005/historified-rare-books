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
    const { results } = await c.env.DB.prepare('SELECT id, title, author, price, cover_url, description, pdf_r2_key, sample_pdf_r2_key FROM books').all()
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
    
    return c.json({ book })
  } catch (error) {
    return c.json({ error: 'Failed to fetch book', details: (error as Error).message }, 500)
  }
})

// Create book (admin only)
books.post('/', authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json()
  const { title, author, description, price, cover_url, pdf_r2_key, pdfKey, sample_pdf_r2_key } = body
  const keyToUse = pdf_r2_key || pdfKey || null
  const sampleKeyToUse = sample_pdf_r2_key || null
  
  const id = crypto.randomUUID()
  
  try {
    await c.env.DB.prepare(
      'INSERT INTO books (id, title, author, description, price, cover_url, pdf_r2_key, sample_pdf_r2_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, title, author, description, price, cover_url || null, keyToUse, sampleKeyToUse).run()
    
    return c.json({ id, message: 'Book created successfully' }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create book', details: (error as Error).message }, 500)
  }
})

// Update book (admin only)
books.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const { title, author, description, price, cover_url, pdf_r2_key, pdfKey, sample_pdf_r2_key } = body
  const keyToUse = pdf_r2_key || pdfKey || null
  
  try {
    await c.env.DB.prepare(
      'UPDATE books SET title = COALESCE(?, title), author = COALESCE(?, author), description = COALESCE(?, description), price = COALESCE(?, price), cover_url = COALESCE(?, cover_url), pdf_r2_key = COALESCE(?, pdf_r2_key), sample_pdf_r2_key = COALESCE(?, sample_pdf_r2_key) WHERE id = ?'
    ).bind(title, author, description, price, cover_url, keyToUse, sample_pdf_r2_key || null, id).run()
    
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
