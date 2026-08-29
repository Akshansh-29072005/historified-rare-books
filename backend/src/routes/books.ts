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
  const { results } = await c.env.DB.prepare('SELECT id, title, author, price, cover_url, description FROM books').all()
  return c.json(results)
})

// Get single book (public)
books.get('/:id', async (c) => {
  const id = c.req.param('id')
  const book = await c.env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(id).first()
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404)
  }
  
  return c.json(book)
})

// Create book (admin only)
books.post('/', authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json()
  const { title, author, description, price, cover_url, pdf_key } = body
  
  const id = crypto.randomUUID()
  
  try {
    await c.env.DB.prepare(
      'INSERT INTO books (id, title, author, description, price, cover_url, pdf_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(id, title, author, description, price, cover_url || null, pdf_key || null).run()
    
    return c.json({ id, message: 'Book created successfully' }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create book', details: (error as Error).message }, 500)
  }
})

// Update book (admin only)
books.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  // Minimal update implementation for simplicity
  const { title, author, description, price, cover_url, pdf_key } = body
  
  try {
    await c.env.DB.prepare(
      'UPDATE books SET title = COALESCE(?, title), author = COALESCE(?, author), description = COALESCE(?, description), price = COALESCE(?, price), cover_url = COALESCE(?, cover_url), pdf_key = COALESCE(?, pdf_key), updated_at = datetime("now") WHERE id = ?'
    ).bind(title, author, description, price, cover_url, pdf_key, id).run()
    
    return c.json({ message: 'Book updated successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to update book' }, 500)
  }
})

// Delete book (admin only)
books.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id')
  
  try {
    await c.env.DB.prepare('DELETE FROM books WHERE id = ?').bind(id).run()
    return c.json({ message: 'Book deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete book' }, 500)
  }
})

export default books
