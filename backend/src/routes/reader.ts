import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'

type Variables = {
  user?: User
}

const reader = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Public route for reading 5-page sample stream
reader.get('/:bookId/sample-pdf', async (c) => {
  const bookId = c.req.param('bookId')

  const book = await c.env.DB.prepare(
    'SELECT pdf_r2_key, sample_pdf_r2_key FROM books WHERE id = ?'
  ).bind(bookId).first<{ pdf_r2_key: string, sample_pdf_r2_key?: string }>()
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404)
  }

  const keyToServe = book.sample_pdf_r2_key || book.pdf_r2_key
  if (!keyToServe) {
    return c.json({ error: 'PDF not found for this book' }, 404)
  }

  const object = await c.env.R2_BUCKET.get(keyToServe)

  if (!object) {
    return c.json({ error: 'PDF file not found in storage' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('content-type', 'application/pdf')
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-headers', 'Authorization, Content-Type, Range')
  headers.set('access-control-expose-headers', 'Content-Length, Content-Type, ETag')

  return new Response(object.body, {
    headers
  })
})

// Protected routes require authentication
reader.use('*', authMiddleware)

reader.get('/:bookId/pdf', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const bookId = c.req.param('bookId')

  // Check purchase status
  const purchase = await c.env.DB.prepare(
    'SELECT * FROM purchases WHERE user_id = ? AND book_id = ? AND status = ?'
  ).bind(user.id, bookId, 'COMPLETED').first()

  if (!purchase && user.role !== 'admin') {
    return c.json({ error: 'Purchase required to read this book' }, 403)
  }

  const book = await c.env.DB.prepare('SELECT pdf_r2_key FROM books WHERE id = ?').bind(bookId).first<{ pdf_r2_key: string }>()
  
  if (!book || !book.pdf_r2_key) {
    return c.json({ error: 'PDF not found for this book' }, 404)
  }

  const object = await c.env.R2_BUCKET.get(book.pdf_r2_key)

  if (!object) {
    return c.json({ error: 'PDF file not found in storage' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('content-type', 'application/pdf')
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-headers', 'Authorization, Content-Type, Range')
  headers.set('access-control-expose-headers', 'Content-Length, Content-Type, ETag')

  return new Response(object.body, {
    headers
  })
})

reader.get('/:bookId/progress', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const bookId = c.req.param('bookId')

  try {
    const progress = await c.env.DB.prepare(
      'SELECT last_read_page, bookmarks FROM reading_progress WHERE user_id = ? AND book_id = ?'
    ).bind(user.id, bookId).first()

    if (!progress) {
      return c.json({ last_read_page: 1, bookmarks: '[]' })
    }

    return c.json(progress)
  } catch (error) {
    return c.json({ last_read_page: 1, bookmarks: '[]' })
  }
})

reader.put('/:bookId/progress', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const bookId = c.req.param('bookId')
  const { last_read_page, bookmarks } = await c.req.json()

  try {
    const pageVal = last_read_page !== undefined ? last_read_page : 1
    const bookmarkVal = typeof bookmarks === 'string' ? bookmarks : JSON.stringify(bookmarks || [])

    await c.env.DB.prepare(`
      INSERT INTO reading_progress (user_id, book_id, last_read_page, bookmarks)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, book_id) DO UPDATE SET
        last_read_page = excluded.last_read_page,
        bookmarks = excluded.bookmarks
    `).bind(
      user.id, 
      bookId, 
      pageVal, 
      bookmarkVal
    ).run()

    return c.json({ message: 'Progress updated successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to update progress', details: (error as Error).message }, 500)
  }
})

export default reader
